const fs = require('fs');
const file = 'D:/GHMC/New-project/Magazine-Project/src/lib/activityLogger.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /if \(!companyId \|\| !userId\) \{/,
  "if (!companyId || companyId === 'none' || !userId) {"
);

fs.writeFileSync(file, content);
console.log('activityLogger.ts updated successfully');
