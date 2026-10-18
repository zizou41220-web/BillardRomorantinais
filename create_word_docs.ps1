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
    
    # Récupération des styles intégrés (Index négatifs = constants de WdBuiltinStyle, fonctionne dans toutes les langues)
    $styleNormal = $doc.Styles.Item(-1) # wdStyleNormal
    $styleH1 = $doc.Styles.Item(-2)     # wdStyleHeading1
    $styleH2 = $doc.Styles.Item(-3)     # wdStyleHeading2
    $styleH3 = $doc.Styles.Item(-4)     # wdStyleHeading3
    
    # ----------------------------------------------------------------
    # 🎨 THÈME ULTRA-MODERNE : Polices sans-serif et couleurs élégantes
    # (Les couleurs Word via COM sont au format BGR : Bleu, Vert, Rouge)
    # ----------------------------------------------------------------
    
    $fontFamily = "Segoe UI" # Moderne et très lisible
    
    # Titre 1 (Couleur : Bleu roi profond)
    $styleH1.Font.Name = $fontFamily
    $styleH1.Font.Size = 24
    $styleH1.Font.Color = 8011530   # BGR : ~ #8A3E1E
    $styleH1.Font.Bold = $true
    $styleH1.ParagraphFormat.SpaceBefore = 24
    $styleH1.ParagraphFormat.SpaceAfter = 12
    $styleH1.ParagraphFormat.Borders.Enable = $false

    # Titre 2 (Couleur : Bleu cyan / Marine)
    $styleH2.Font.Name = $fontFamily
    $styleH2.Font.Size = 16
    $styleH2.Font.Color = 11163155  # BGR
    $styleH2.Font.Bold = $true
    $styleH2.ParagraphFormat.SpaceBefore = 16
    $styleH2.ParagraphFormat.SpaceAfter = 8

    # Titre 3 (Couleur : Gris foncé / Anthracite)
    $styleH3.Font.Name = $fontFamily
    $styleH3.Font.Size = 13
    $styleH3.Font.Color = 5921370   # BGR
    $styleH3.Font.Bold = $true
    $styleH3.ParagraphFormat.SpaceBefore = 12
    $styleH3.ParagraphFormat.SpaceAfter = 6

    # Texte Normal
    $styleNormal.Font.Name = $fontFamily
    $styleNormal.Font.Size = 11
    $styleNormal.Font.Color = 3355443 # Gris très foncé (presque noir)
    $styleNormal.ParagraphFormat.SpaceAfter = 10
    $styleNormal.ParagraphFormat.LineSpacingRule = 1 # wdLineSpaceSingle

    $lines = $Content -replace "`r`n", "`n" -split "`n"
    
    foreach ($line in $lines) {
        $line = $line.Trim()
        
        # 1. Gestion des IMAGES avec la syntaxe : [IMAGE: chemin_du_fichier]
        if ($line -match "^\[IMAGE:\s*(.+)\]$") {
            $imgPath = $matches[1]
            
            # Gestion des chemins relatifs (on cherche à partir du dossier du script)
            if (-not [System.IO.Path]::IsPathRooted($imgPath)) {
                $imgPath = Join-Path $PWD $imgPath
            }
            
            if (Test-Path $imgPath) {
                # Centrer l'image
                $selection.ParagraphFormat.Alignment = 1 # wdAlignParagraphCenter
                $shape = $selection.InlineShapes.AddPicture($imgPath, $false, $true)
                $selection.TypeParagraph()
                $selection.ParagraphFormat.Alignment = 0 # wdAlignParagraphLeft
            } else {
                $selection.Style = $styleNormal
                $selection.Font.Italic = $true
                $selection.Font.Color = 255 # Rouge (BGR = 255 -> #FF0000)
                $selection.TypeText("[IMAGE INTROUVABLE : $imgPath]")
                $selection.TypeParagraph()
                $selection.Font.Italic = $false
                $selection.Font.Color = 3355443
            }
            continue
        }

        # 2. Gestion des placeholders (Texte entre parenthèses commençant par Insérer)
        if ($line -match "^\(Insérer capture d'écran") {
            $selection.Style = $styleNormal
            $selection.Font.Italic = $true
            $selection.Font.Color = 8421504 # Gris clair
            $selection.TypeText($line)
            $selection.TypeParagraph()
            continue
        }

        # 3. Titres (Markdown H1, H2, H3)
        if ($line.StartsWith("# ")) {
            $selection.Style = $styleH1
            $selection.TypeText($line.Substring(2))
            $selection.TypeParagraph()
        } elseif ($line.StartsWith("## ")) {
            $selection.Style = $styleH2
            $selection.TypeText($line.Substring(3))
            $selection.TypeParagraph()
        } elseif ($line.StartsWith("### ")) {
            $selection.Style = $styleH3
            $selection.TypeText($line.Substring(4))
            $selection.TypeParagraph()
        } 
        # 4. Listes à puces simples
        elseif ($line.StartsWith("- ")) {
            $selection.Style = $styleNormal
            $selection.Range.ListFormat.ApplyBulletDefault()
            
            # Gestion du gras dans les listes
            $texteListe = $line.Substring(2)
            $parts = $texteListe -split "\*\*"
            for ($i = 0; $i -lt $parts.Length; $i++) {
                if ($i % 2 -eq 1) {
                    $selection.Font.Bold = $true
                    $selection.TypeText($parts[$i])
                    $selection.Font.Bold = $false
                } else {
                    $selection.TypeText($parts[$i])
                }
            }
            
            $selection.TypeParagraph()
            $selection.Range.ListFormat.RemoveNumbers()
        } 
        # 5. Listes numérotées
        elseif ($line -match "^(\d+)\. (.*)") {
            $selection.Style = $styleNormal
            $selection.Range.ListFormat.ApplyNumberDefault()
            
            $texteListe = $matches[2]
            $parts = $texteListe -split "\*\*"
            for ($i = 0; $i -lt $parts.Length; $i++) {
                if ($i % 2 -eq 1) {
                    $selection.Font.Bold = $true
                    $selection.TypeText($parts[$i])
                    $selection.Font.Bold = $false
                } else {
                    $selection.TypeText($parts[$i])
                }
            }
            
            $selection.TypeParagraph()
            $selection.Range.ListFormat.RemoveNumbers()
        } 
        # 6. Lignes vides (On ignore, le LineSpacing s'en charge)
        elseif ($line -eq "") {
            # Ignorer
        } 
        # 7. Texte standard avec gestion du gras **texte**
        else {
            $selection.Style = $styleNormal
            $parts = $line -split "\*\*"
            for ($i = 0; $i -lt $parts.Length; $i++) {
                if ($i % 2 -eq 1) {
                    $selection.Font.Bold = $true
                    $selection.TypeText($parts[$i])
                    $selection.Font.Bold = $false
                } else {
                    $selection.TypeText($parts[$i])
                }
            }
            $selection.TypeParagraph()
        }
    }
    
    # Sauvegarde (supprimer l'ancien s'il existe pour éviter le prompt de confirmation)
    if (Test-Path $FilePath) {
        Remove-Item $FilePath -Force
    }
    $doc.SaveAs([ref]$FilePath)
    $doc.Close()
}

$desktopPath = [Environment]::GetFolderPath("Desktop")

Write-Host "Initialisation de la création des documents Word..."

# Lecture forcée en UTF-8 pour les accents
$membresContent = [System.IO.File]::ReadAllText(".\membres.txt", [System.Text.Encoding]::UTF8)
$adminsContent = [System.IO.File]::ReadAllText(".\admins.txt", [System.Text.Encoding]::UTF8)

Write-Host "Création de Tutoriel_Membres.docx avec design moderne..."
Create-Doc "$desktopPath\Tutoriel_Membres.docx" $membresContent

Write-Host "Création de Tutoriel_Admins.docx avec design moderne..."
Create-Doc "$desktopPath\Tutoriel_Admins.docx" $adminsContent

$word.Quit()
Write-Host "Terminé ! Les superbes documents Word sont sur votre bureau."
