VERSION 5.00
Begin VB.Form Form1 
   BorderStyle     =   1  'Fixed Single
   Caption         =   "Codes barre EAN 8 & 13 / EAN 8 & 13 bar codes"
   ClientHeight    =   4980
   ClientLeft      =   45
   ClientTop       =   330
   ClientWidth     =   7245
   Icon            =   "Form1.frx":0000
   LinkTopic       =   "Form1"
   MaxButton       =   0   'False
   ScaleHeight     =   4980
   ScaleWidth      =   7245
   StartUpPosition =   3  'Windows Default
   Begin VB.OptionButton Option2 
      Caption         =   "EAN 13"
      Height          =   255
      Left            =   2040
      TabIndex        =   18
      Top             =   720
      Value           =   -1  'True
      Width           =   855
   End
   Begin VB.OptionButton Option1 
      Caption         =   "EAN 8"
      Height          =   255
      Left            =   2040
      TabIndex        =   17
      Top             =   450
      Width           =   855
   End
   Begin VB.TextBox Text2 
      Appearance      =   0  'Flat
      Height          =   375
      Left            =   4320
      MaxLength       =   5
      TabIndex        =   9
      Top             =   1080
      Width           =   975
   End
   Begin VB.CommandButton Command2 
      Caption         =   "&Copier / Copy"
      Height          =   375
      Left            =   5880
      TabIndex        =   7
      Top             =   600
      Width           =   1215
   End
   Begin VB.CommandButton Command1 
      Caption         =   "&Fermer / Close"
      Height          =   375
      Left            =   120
      TabIndex        =   1
      Top             =   4440
      Width           =   1215
   End
   Begin VB.TextBox Text1 
      Appearance      =   0  'Flat
      Height          =   375
      Left            =   120
      MaxLength       =   12
      TabIndex        =   0
      Top             =   600
      Width           =   1455
   End
   Begin VB.Label Label13 
      Alignment       =   1  'Right Justify
      Caption         =   "Grandzebu (Français)"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   9.75
         Charset         =   0
         Weight          =   400
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      ForeColor       =   &H00FF0000&
      Height          =   255
      Left            =   5160
      MouseIcon       =   "Form1.frx":0442
      MousePointer    =   99  'Custom
      TabIndex        =   16
      Top             =   4320
      Width           =   1935
   End
   Begin VB.Label Label6 
      Alignment       =   1  'Right Justify
      Caption         =   "Grandzebu (English)"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   9.75
         Charset         =   0
         Weight          =   400
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      ForeColor       =   &H00FF0000&
      Height          =   255
      Left            =   5160
      MouseIcon       =   "Form1.frx":0884
      MousePointer    =   99  'Custom
      TabIndex        =   15
      Top             =   4620
      Width           =   1935
   End
   Begin VB.Label Label12 
      Alignment       =   1  'Right Justify
      Caption         =   "Supplied under GNU GPL license by :"
      Height          =   195
      Left            =   2160
      TabIndex        =   14
      Top             =   4650
      Width           =   2895
   End
   Begin VB.Label Label11 
      Caption         =   "If necessary type here your 2 or 5 digits add-on :"
      Height          =   200
      Left            =   120
      TabIndex        =   13
      Top             =   1280
      Width           =   4215
   End
   Begin VB.Label Label10 
      Caption         =   "Here is the code string :"
      Height          =   200
      Left            =   3120
      TabIndex        =   12
      Top             =   320
      Width           =   2295
   End
   Begin VB.Label Label9 
      Caption         =   "Type your code here :"
      Height          =   200
      Left            =   120
      TabIndex        =   11
      Top             =   320
      Width           =   1815
   End
   Begin VB.Label Label8 
      Caption         =   "Indiquez le cas échéant le supplément à 2 ou 5 chiffres :"
      Height          =   200
      Left            =   120
      TabIndex        =   8
      Top             =   1080
      Width           =   4215
   End
   Begin VB.Label Label7 
      Alignment       =   1  'Right Justify
      Caption         =   "Fourni sous license GNU GPL par :"
      Height          =   195
      Left            =   2400
      TabIndex        =   10
      Top             =   4350
      Width           =   2655
   End
   Begin VB.Label Label5 
      Appearance      =   0  'Flat
      BackColor       =   &H80000005&
      BorderStyle     =   1  'Fixed Single
      ForeColor       =   &H80000008&
      Height          =   375
      Left            =   3120
      TabIndex        =   6
      Top             =   600
      Width           =   2655
   End
   Begin VB.Label Label4 
      Caption         =   "Voici la chaine de code :"
      Height          =   200
      Left            =   3120
      TabIndex        =   5
      Top             =   120
      Width           =   2295
   End
   Begin VB.Label Label3 
      Caption         =   "Voici le résultat / Here is the result :"
      Height          =   195
      Left            =   120
      TabIndex        =   4
      Top             =   1600
      Width           =   3135
   End
   Begin VB.Label Label2 
      Caption         =   "Tapez votre code ici :"
      Height          =   200
      Left            =   120
      TabIndex        =   3
      Top             =   120
      Width           =   1815
   End
   Begin VB.Label Label1 
      Alignment       =   2  'Center
      Appearance      =   0  'Flat
      BackColor       =   &H80000005&
      BorderStyle     =   1  'Fixed Single
      BeginProperty Font 
         Name            =   "Code EAN13"
         Size            =   80.25
         Charset         =   2
         Weight          =   400
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      ForeColor       =   &H80000008&
      Height          =   2295
      Left            =   120
      TabIndex        =   2
      Top             =   1920
      Width           =   6975
   End
End
Attribute VB_Name = "Form1"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
'Copyright (C) 2003 (Grandzebu)
'Ce programme ainsi que la police de caractères qui l'accompagne est libre, vous pouvez le redistribuer et/ou le modifier
'selon les termes de la Licence Publique Générale GNU publiée par la Free Software Foundation (version 2 ou bien toute
'autre version ultérieure choisie par vous).
'Les fonctions d'encodage des codes barres sont régies par la Licence Générale Publique Amoindrie GNU (GNU LGPL)
'Ce programme est distribué car potentiellement utile, mais SANS AUCUNE GARANTIE, ni explicite ni implicite,
'y compris les garanties de commercialisation ou d'adaptation dans un but spécifique. Reportez-vous à la Licence
'Publique Générale GNU pour plus de détails.
'Veuillez charger une copie de la license à l'adresse : http://www.gnu.org/licenses/
'Une traduction non officielle se trouve à l'adresse : http://gnu.mirror.fr/licenses/translations.fr.html

'Copyright (C) 2003 (Grandzebu)
'This program and the font which is supplied with it is free, you can redistribute it and/or
'modify it under the terms of the GNU General Public License as published by the Free Software Foundation
'either version 2 of the License, or (at your option) any later version.
'The barcode encoding functions are governed by the GNU Lesser General Public License (GNU LGPL)
'This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without
'even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General
'Public License for more details.
'Please download a license copy at : http://www.gnu.org/licenses/

'V. 3.0.0

Option Explicit
Private Declare Function ShellExecute Lib "shell32.dll" Alias "ShellExecuteA" (ByVal hWnd As Long, ByVal lpOperation As String, ByVal lpFile As String, ByVal lpParameters As String, ByVal lpDirectory As String, ByVal nShowCmd As Long) As Long
Private EANLen%

Private Sub Command1_Click()
  Unload Me
End Sub

Private Sub Command2_Click()
  Clipboard.Clear
  Clipboard.SetText Label5.Caption
End Sub

Private Sub Form_Load()
  EANLen% = 12
End Sub

Private Sub Label13_Click()
  ShellExecute Me.hWnd, "open", "http://grandzebu.net", vbNullString, vbNullString, 3
End Sub

Private Sub Label6_Click()
  ShellExecute Me.hWnd, "open", "http://grandzebu.net/informatique/codbar-en/codbar.htm", vbNullString, vbNullString, 3
End Sub

Private Sub Option1_Click()
  EANLen% = 7
  Text1.MaxLength = 7
  Text1 = Left$(Text1, 7)
End Sub

Private Sub Option2_Click()
  EANLen% = 12
  Text1.MaxLength = 12
End Sub

Private Sub Text1_Change()
  Dim CodeBarre$, CodeClair$
  If Text1 <> "" Then
    'Ajustement à 7 ou 12 chiffres en ajoutant des zéros
    'Adjust the length to 7 or 12 digits by adding zeros
    CodeClair$ = Text1 & String$(EANLen% - Len(Text1), "0")
    CodeBarre$ = IIf(EANLen% = 7, EAN8$(CodeClair$), EAN13$(CodeClair$))
    Label5.Caption = CodeBarre$ & AddOn(Text2)
    Label1.Caption = CodeBarre$ & AddOn(Text2)
  End If
End Sub

Private Sub Text2_Change()
  Call Text1_Change
End Sub

Public Function EAN8$(chaine$)
  'Cette fonction est régie par la Licence Générale Publique Amoindrie GNU (GNU LGPL)
  'This function is governed by the GNU Lesser General Public License (GNU LGPL)
  'V 1.0.0
  'Paramètres : une chaine de 7 chiffres
  'Parameters : a 7 digits length string
  'Retour : * une chaine qui, affichée avec la police EAN13.TTF, donne le code barre
  '         * une chaine vide si paramètre fourni incorrect
  'Return : * a string which give the bar code when it is dispayed with EAN13.TTF font
  '         * an empty string if the supplied parameter is no good
  Dim i%, checksum%, first%, CodeBarre$, tableA As Boolean
  EAN8$ = ""
  'Vérifier qu'il y a 7 caractères
  'Check for 7 characters
  If Len(chaine$) = 7 Then
    'Et que ce sont bien des chiffres
    'And they are really digits
    For i% = 1 To 7
      If Asc(Mid$(chaine$, i%, 1)) < 48 Or Asc(Mid$(chaine$, i%, 1)) > 57 Then
        i% = 0
        Exit For
      End If
    Next
    If i% = 8 Then
      'Calcul de la clé de contrôle
      'Calculation of the checksum
      For i% = 7 To 1 Step -2
        checksum% = checksum% + Val(Mid$(chaine$, i%, 1))
      Next
      checksum% = checksum% * 3
      For i% = 6 To 1 Step -2
        checksum% = checksum% + Val(Mid$(chaine$, i%, 1))
      Next
      chaine$ = chaine$ & (10 - checksum% Mod 10) Mod 10
      'Les 4 premier chiffre viennent de la table A
      'The first 4 digits come from table A
      CodeBarre$ = ":"   'Ajout marque de début / Add start mark
      For i% = 1 To 4
         CodeBarre$ = CodeBarre$ & Chr$(65 + Val(Mid$(chaine$, i%, 1)))
      Next
      CodeBarre$ = CodeBarre$ & "*"   'Ajout séparateur central / Add middle separator
      For i% = 5 To 8
        CodeBarre$ = CodeBarre$ & Chr$(97 + Val(Mid$(chaine$, i%, 1)))
      Next
      CodeBarre$ = CodeBarre$ & "+"   'Ajout de la marque de fin / Add end mark
      EAN8$ = CodeBarre$
    End If
  End If
End Function

Public Function EAN13$(chaine$)
  'Cette fonction est régie par la Licence Générale Publique Amoindrie GNU (GNU LGPL)
  'This function is governed by the GNU Lesser General Public License (GNU LGPL)
  'V 1.1.1
  'Paramètres : une chaine de 12 chiffres
  'Parameters : a 12 digits length string
  'Retour : * une chaine qui, affichée avec la police EAN13.TTF, donne le code barre
  '         * une chaine vide si paramètre fourni incorrect
  'Return : * a string which give the bar code when it is dispayed with EAN13.TTF font
  '         * an empty string if the supplied parameter is no good
  Dim i%, checksum%, first%, CodeBarre$, tableA As Boolean
  EAN13$ = ""
  'Vérifier qu'il y a 12 caractères
  'Check for 12 characters
  If Len(chaine$) = 12 Then
    'Et que ce sont bien des chiffres
    'And they are really digits
    For i% = 1 To 12
      If Asc(Mid$(chaine$, i%, 1)) < 48 Or Asc(Mid$(chaine$, i%, 1)) > 57 Then
        i% = 0
        Exit For
      End If
    Next
    If i% = 13 Then
      'Calcul de la clé de contrôle
      'Calculation of the checksum
      For i% = 12 To 1 Step -2
        checksum% = checksum% + Val(Mid$(chaine$, i%, 1))
      Next
      checksum% = checksum% * 3
      For i% = 11 To 1 Step -2
        checksum% = checksum% + Val(Mid$(chaine$, i%, 1))
      Next
      chaine$ = chaine$ & (10 - checksum% Mod 10) Mod 10
      'Le premier chiffre est pris tel quel, le deuxième vient de la table A
      'The first digit is taken just as it is, the second one come from table A
      CodeBarre$ = Left$(chaine$, 1) & Chr$(65 + Val(Mid$(chaine$, 2, 1)))
      first% = Val(Left$(chaine$, 1))
      For i% = 3 To 7
        tableA = False
         Select Case i%
         Case 3
           Select Case first%
           Case 0 To 3
             tableA = True
           End Select
         Case 4
           Select Case first%
           Case 0, 4, 7, 8
             tableA = True
           End Select
         Case 5
           Select Case first%
           Case 0, 1, 4, 5, 9
             tableA = True
           End Select
         Case 6
           Select Case first%
           Case 0, 2, 5, 6, 7
             tableA = True
           End Select
         Case 7
           Select Case first%
           Case 0, 3, 6, 8, 9
             tableA = True
           End Select
         End Select
       If tableA Then
         CodeBarre$ = CodeBarre$ & Chr$(65 + Val(Mid$(chaine$, i%, 1)))
       Else
         CodeBarre$ = CodeBarre$ & Chr$(75 + Val(Mid$(chaine$, i%, 1)))
       End If
     Next
      CodeBarre$ = CodeBarre$ & "*"   'Ajout séparateur central / Add middle separator
      For i% = 8 To 13
        CodeBarre$ = CodeBarre$ & Chr$(97 + Val(Mid$(chaine$, i%, 1)))
      Next
      CodeBarre$ = CodeBarre$ & "+"   'Ajout de la marque de fin / Add end mark
      EAN13$ = CodeBarre$
    End If
  End If
End Function

Public Function AddOn$(chaine$)
  'Cette fonction est régie par la Licence Générale Publique Amoindrie GNU (GNU LGPL)
  'This function is governed by the GNU Lesser General Public License (GNU LGPL)
  'V 1.0
  'Paramètres : une chaine de 2 ou 5 chiffres
  'Parameters : A 2 or 5 digits length string
  'Retour : * une chaine qui, affichée avec la police EAN13.TTF, donne le code barre supplementaire
  '         * une chaine vide si paramètre fourni incorrect
  'Return : * a string which give the add-on bar code when it is dispayed with EAN13.TTF font
  '         * an empty string if the supplied parameter is no good
  Dim i%, checksum%, first%, CodeBarre$, tableA As Boolean
  AddOn$ = ""
  'Vérifier qu'il y a 2 ou 5 caractères
  'Check for 2 or 5 characters
  If Len(chaine$) = 2 Or Len(chaine$) = 5 Then
    'Et que ce sont bien des chiffres
    'And it is digits
    For i% = 1 To Len(chaine$)
      If Asc(Mid$(chaine$, i%, 1)) < 48 Or Asc(Mid$(chaine$, i%, 1)) > 57 Then
        Exit Function
      End If
    Next
    'Calcul de la clé de contrôle
    'Checksum calculation
    If Len(chaine$) = 2 Then
      checksum% = 10 + chaine$ Mod 4 'On augmente la checksum de 10 pour faciliter les tests plus bas / We add 10 to the checksum for make easier the below tests
    Else
      For i% = 1 To 5 Step 2
        checksum% = checksum% + Val(Mid$(chaine$, i%, 1))
      Next
      checksum% = (checksum% * 3 + Val(Mid$(chaine$, 2, 1)) * 9 + Val(Mid$(chaine$, 4, 1)) * 9) Mod 10
    End If
    AddOn$ = "["
    For i% = 1 To Len(chaine$)
      tableA = False
      Select Case i%
      Case 1
        Select Case checksum%
        Case 4 To 9, 10, 11
          tableA = True
        End Select
      Case 2
        Select Case checksum%
        Case 1, 2, 3, 5, 6, 9, 10, 12
          tableA = True
        End Select
      Case 3
        Select Case checksum%
        Case 0, 2, 3, 6, 7, 8
          tableA = True
        End Select
      Case 4
        Select Case checksum%
        Case 0, 1, 3, 4, 8, 9
          tableA = True
        End Select
      Case 5
        Select Case checksum%
        Case 0, 1, 2, 4, 5, 7
          tableA = True
        End Select
      End Select
      If tableA Then
        AddOn$ = AddOn$ & Chr$(65 + Val(Mid$(chaine$, i%, 1)))
      Else
        AddOn$ = AddOn$ & Chr$(75 + Val(Mid$(chaine$, i%, 1)))
      End If
      If (Len(chaine$) = 2 And i% = 1) Or (Len(chaine$) = 5 And i% < 5) Then AddOn$ = AddOn$ & Chr$(92) 'Ajout du séparateur de caractère / Add character separator
    Next
  End If
End Function
