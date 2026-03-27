$files = @(
  'src/pages/Courses.tsx',
  'src/pages/CourseLearning.tsx',
  'src/pages/CourseDetail.tsx',
  'src/pages/AdminPanel.tsx'
)

foreach ($file in $files) {
  if (Test-Path $file) {
    $content = Get-Content $file -Raw
    
    # Add import if not exists
    if ($content -notmatch "import toast from 'react-hot-toast'") {
      $content = $content -replace "(import.*from 'react-i18next')", "`$1`nimport toast from 'react-hot-toast'"
    }
    
    # Replace alert( with toast.error(
    $content = $content -replace 'alert\(', 'toast.error('
    
    Set-Content $file $content -NoNewline
    Write-Host "Updated: $file"
  }
}
