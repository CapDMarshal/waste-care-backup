#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const TurndownService = require('turndown');

(async () => {
  try {
    const inputPath = path.resolve(process.cwd(), 'PUI - Bab 1.docx');
    const outputPath = path.resolve(process.cwd(), 'PUI - Bab 1.md');

    if (!fs.existsSync(inputPath)) {
      console.error('Input DOCX not found:', inputPath);
      process.exit(2);
    }

    const { value: html } = await mammoth.convertToHtml({ path: inputPath });

    const td = new TurndownService({ headingStyle: 'atx' });
    td.addRule('pre', {
      filter: function (node) {
        return node.nodeName === 'PRE';
      },
      replacement: function (content) {
        return '\n\n```\n' + content + '\n```\n\n';
      }
    });

    const markdown = td.turndown(html);

    fs.writeFileSync(outputPath, markdown, 'utf8');
    console.log('Wrote Markdown to', outputPath);
  } catch (err) {
    console.error('Conversion failed:', err);
    process.exit(1);
  }
})();
