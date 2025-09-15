# service.py
import os
import sys
import subprocess
import win32serviceutil
import win32service
import win32event
import servicemanager
import time

# Dapatkan path absolut ke direktori tempat skrip ini berada
script_dir = os.path.dirname(os.path.realpath(__file__))
script_to_run = os.path.join(script_dir, 'run.py')
log_file = os.path.join(script_dir, 'service.log') # Path untuk file log

# --- PERBAIKAN ---
# Saat dijalankan sebagai service, sys.executable menunjuk ke pythonservice.exe.
# Kita perlu path ke python.exe yang sebenarnya.
if getattr(sys, 'frozen', False):
    # Jika dijalankan dari executable yang dibekukan (seperti pyinstaller)
    python_executable = sys.executable
else:
    # Cari python.exe di direktori yang sama dengan sys.executable
    python_executable = os.path.join(os.path.dirname(sys.executable), 'python.exe')


class PythonAppService(win32serviceutil.ServiceFramework):
    """Definisi Windows Service untuk aplikasi Python."""
    
    _svc_name_ = "ApiGarmen"
    _svc_display_name_ = "API for Garmen"
    _svc_description_ = "Menjalankan aplikasi Python dengan server Waitress di latar belakang."

    def __init__(self, args):
        win32serviceutil.ServiceFramework.__init__(self, args)
        self.hWaitStop = win32event.CreateEvent(None, 0, 0, None)
        self.process = None

    def SvcStop(self):
        """Dipanggil saat service dihentikan."""
        self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
        self.log("Service is stopping.")
        if self.process:
            try:
                self.process.terminate()
                self.process.wait(timeout=5)
                self.log("Subprocess terminated.")
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.log("Subprocess killed forcibly.")
            except Exception as e:
                self.log(f"Error terminating process: {e}")
        
        win32event.SetEvent(self.hWaitStop)
        self.ReportServiceStatus(win32service.SERVICE_STOPPED)
        self.log("Service stopped.")

    def SvcDoRun(self):
        """Dipanggil saat service dimulai."""
        servicemanager.LogMsg(servicemanager.EVENTLOG_INFORMATION_TYPE,
                              servicemanager.PYS_SERVICE_STARTED,
                              (self._svc_name_, ''))
        self.log("Service is starting.")
        self.main()

    def log(self, message):
        """Menulis pesan ke file log."""
        with open(log_file, 'a', encoding='utf-8') as f:
            timestamp = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime())
            f.write(f"[{timestamp}] {message}\n")

    def main(self):
        """Logika utama service."""
        try:
            self.log(f"Starting subprocess: {python_executable} {script_to_run}")
            
            # Buka file log untuk menulis stdout dan stderr dari subprocess
            with open(log_file, 'a', encoding='utf-8') as f_log:
                self.process = subprocess.Popen([python_executable, script_to_run],
                                                cwd=script_dir,
                                                stdout=f_log,
                                                stderr=f_log,
                                                creationflags=subprocess.CREATE_NO_WINDOW)
            
            self.log(f"Subprocess started with PID: {self.process.pid}")
            win32event.WaitForSingleObject(self.hWaitStop, win32event.INFINITE)

        except Exception as e:
            self.log(f"Error in service main loop: {e}")
            self.SvcStop()


if __name__ == '__main__':
    win32serviceutil.HandleCommandLine(PythonAppService)
