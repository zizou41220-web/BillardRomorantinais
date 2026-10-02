try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
} catch {
    Write-Host "Microsoft Word n'est pas installé sur cet ordinateur."
    exit
}

function Create-Doc {
    param([string]$FilePath, [string]$Content)
    
    $doc = $word.Documents.Add()
    $selection = $word.Selection
    
    # Remplacer les retours à la ligne Windows pour uniformiser
    $lines = $Content -replace "`r`n", "`n" -split "`n"
    foreach ($line in $lines) {
        $line = $line.Trim()
        if ($line.StartsWith("# ")) {
            $selection.Font.Size = 18
            $selection.Font.Bold = $true
            $selection.TypeText($line.Substring(2))
            $selection.TypeParagraph()
            $selection.Font.Size = 11
            $selection.Font.Bold = $false
        } elseif ($line.StartsWith("## ")) {
            $selection.TypeParagraph()
            $selection.Font.Size = 14
            $selection.Font.Bold = $true
            $selection.TypeText($line.Substring(3))
            $selection.TypeParagraph()
            $selection.Font.Size = 11
            $selection.Font.Bold = $false
        } elseif ($line.StartsWith("### ")) {
            $selection.TypeParagraph()
            $selection.Font.Size = 12
            $selection.Font.Bold = $true
            $selection.TypeText($line.Substring(4))
            $selection.TypeParagraph()
            $selection.Font.Size = 11
            $selection.Font.Bold = $false
        } elseif ($line -eq "") {
            $selection.TypeParagraph()
        } else {
            $selection.TypeText($line)
            $selection.TypeParagraph()
        }
    }
    
    $doc.SaveAs([ref]$FilePath)
    $doc.Close()
}

$desktopPath = [Environment]::GetFolderPath("Desktop")

# Lecture forcée en UTF-8
$membresContent = [System.IO.File]::ReadAllText(".\membres.txt", [System.Text.Encoding]::UTF8)
$adminsContent = [System.IO.File]::ReadAllText(".\admins.txt", [System.Text.Encoding]::UTF8)

Write-Host "Création de Tutoriel_Membres.docx..."
Create-Doc "$desktopPath\Tutoriel_Membres.docx" $membresContent

Write-Host "Création de Tutoriel_Admins.docx..."
Create-Doc "$desktopPath\Tutoriel_Admins.docx" $adminsContent

$word.Quit()
Write-Host "Terminé ! Les fichiers sont sur le bureau."
