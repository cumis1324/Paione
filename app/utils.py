# app/utils.py

def calculate_ean13_checksum(barcode_12_digits):
    """Menghitung checksum untuk barcode EAN-13."""
    if not barcode_12_digits.isdigit() or len(barcode_12_digits) != 12:
        return '0'
    odd_sum = sum(int(digit) for digit in barcode_12_digits[0::2])
    even_sum = sum(int(digit) for digit in barcode_12_digits[1::2])
    total_sum = odd_sum + (even_sum * 3)
    check_digit = (10 - (total_sum % 10)) % 10
    return str(check_digit)