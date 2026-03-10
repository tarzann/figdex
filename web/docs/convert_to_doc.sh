#!/bin/bash
# Convert Markdown to DOC using pandoc (if installed) or provide instructions

if command -v pandoc &> /dev/null; then
    echo "Converting to DOCX using pandoc..."
    pandoc MONTHLY_LIMITS_COMPLETE_DOCUMENTATION.md -o MONTHLY_LIMITS_COMPLETE_DOCUMENTATION.docx --reference-doc=/System/Library/Templates/Applications/Pages.app/Contents/Resources/Templates/Blank.template 2>/dev/null || \
    pandoc MONTHLY_LIMITS_COMPLETE_DOCUMENTATION.md -o MONTHLY_LIMITS_COMPLETE_DOCUMENTATION.docx
    echo "✅ Created: MONTHLY_LIMITS_COMPLETE_DOCUMENTATION.docx"
else
    echo "⚠️  Pandoc not installed. Options:"
    echo "1. Install pandoc: brew install pandoc"
    echo "2. Use online converter: https://cloudconvert.com/md-to-docx"
    echo "3. Open in Word/Google Docs (they can import Markdown)"
    echo ""
    echo "📄 File location: $(pwd)/MONTHLY_LIMITS_COMPLETE_DOCUMENTATION.md"
fi
