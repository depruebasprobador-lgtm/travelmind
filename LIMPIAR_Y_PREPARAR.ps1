# =================================================================
#  LIMPIAR_Y_PREPARAR.ps1  (one-shot, ejecuta UNA vez y borra)
#
#  Hace lo siguiente:
#   1) Deshace el commit local con el token dentro (git reset --soft HEAD~1).
#   2) Saca del index los scripts de push y archivos de token,
#      que ya estaban trackeados de antes y por eso .gitignore no los ignoraba.
#   3) Tira el autostash que quedo colgado del intento anterior.
#   4) Te deja todo listo para que ejecutes PUSH_GITHUB.bat normal.
# =================================================================

$ErrorActionPreference = 'Continue'
Set-Location -LiteralPath $PSScriptRoot

function Section($title) {
    Write-Host ''
    Write-Host '============================================' -ForegroundColor Cyan
    Write-Host "  $title" -ForegroundColor Cyan
    Write-Host '============================================' -ForegroundColor Cyan
}

Section 'Paso 1/3 - Deshacer el commit local rechazado'
git reset --soft HEAD~1
if ($LASTEXITCODE -ne 0) {
    Write-Host '[WARN] reset fallo. Quizas no habia commit local que deshacer. Sigo.' -ForegroundColor DarkYellow
}

Section 'Paso 2/3 - Quitar los scripts del index (untrack)'
$toUntrack = @(
    'PUSH_GITHUB.ps1',
    'PUSH_GITHUB.bat',
    'COMMIT_Y_PUSH.bat',
    'push.ps1',
    'push-recurring.ps1',
    'LIMPIAR_Y_PREPARAR.ps1',
    'LIMPIAR_Y_PREPARAR.bat',
    '.git-token',
    '.git-token.txt',
    '.git-token.example'
)
foreach ($f in $toUntrack) {
    git rm --cached --ignore-unmatch -- $f 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  - untrack ok: $f" -ForegroundColor DarkGray
    }
}

Section 'Paso 3/3 - Tirar el autostash colgado'
git stash list
$stashes = (git stash list) | Where-Object { $_ }
if ($stashes) {
    Write-Host 'Borrando todos los stashes (no se necesitan, los cambios estan en el working dir).' -ForegroundColor Yellow
    git stash clear
} else {
    Write-Host '  - no hay stashes pendientes.' -ForegroundColor DarkGray
}

Write-Host ''
Write-Host '============================================' -ForegroundColor Green
Write-Host '  LISTO. Estado actual del repo:' -ForegroundColor Green
Write-Host '============================================' -ForegroundColor Green
git status --short

Write-Host ''
Write-Host 'Ahora ejecuta PUSH_GITHUB.bat (doble clic).' -ForegroundColor Yellow
Write-Host 'Los scripts ya no se subiran al repo.' -ForegroundColor Yellow
Write-Host ''
Read-Host 'Enter para cerrar'
