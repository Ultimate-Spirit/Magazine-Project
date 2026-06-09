const fs = require('fs');
const file = 'D:/GHMC/New-project/Magazine-Project/src/components/FoldersView.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /profiles\(full_name, email\)/g,
  "profiles(fullName:full_name, email)"
);

content = content.replace(
  /profiles\(fullName, email\)/g,
  "profiles(fullName:full_name, email)"
);

// Fallback logic
content = content.replace(
  /const uName = profileData\?.fullName \|\| profileData\?.email/g,
  "const uName = profileData?.fullName || profileData?.full_name || profileData?.email"
);

fs.writeFileSync(file, content);
console.log('FoldersView.tsx updated successfully');
