const fs = require('fs');

try {
// 1. AdminSection.tsx
let adm = fs.readFileSync('components/AdminSection.tsx', 'utf-8');
adm = adm.replace(/import firebase from 'firebase\/compat\/app';\n/g, "");
adm = adm.replace(/import \{ db \} from '\.\.\/services\/supabase';\n/g, "import { supabase } from '../services/supabase';\nimport { User } from '@supabase/supabase-js';\n");
adm = adm.replace(/user: firebase\.User \| null;/g, 'user: User | null;');
adm = adm.replace(/db\.collection/g, 'supabase.from');
fs.writeFileSync('components/AdminSection.tsx', adm, 'utf-8');

// 2. CompactMenuItemCard.tsx
let cmp = fs.readFileSync('components/CompactMenuItemCard.tsx', 'utf-8');
cmp = cmp.replace(/const prices = Object\.values\(effectivePrices\)\.filter\(p => typeof p === 'number' && p > 0\);/g, "const prices = Object.values(effectivePrices).filter(p => typeof p === 'number' && p > 0) as number[];");
fs.writeFileSync('components/CompactMenuItemCard.tsx', cmp, 'utf-8');

// 3. Header.tsx
let hd = fs.readFileSync('components/Header.tsx', 'utf-8');
hd = hd.replace(/import firebase from 'firebase\/compat\/app';\n/g, "import { User } from '@supabase/supabase-js';\n");
hd = hd.replace(/user: firebase\.User \| null;/g, 'user: User | null;');
fs.writeFileSync('components/Header.tsx', hd, 'utf-8');

// 4. LoginModal.tsx
let lg = fs.readFileSync('components/LoginModal.tsx', 'utf-8');
lg = lg.replace(/import firebase from 'firebase\/compat\/app';\n/g, "import { User } from '@supabase/supabase-js';\n");
lg = lg.replace(/import \{ auth \} from '\.\.\/services\/supabase';\n/g, "import { supabase } from '../services/supabase';\n");
lg = lg.replace(/user: firebase\.User \| null;/g, 'user: User | null;');
lg = lg.replace(/await auth\.signInWithEmailAndPassword/g, 'await supabase.auth.signInWithPassword');
lg = lg.replace(/await auth\.createUserWithEmailAndPassword/g, 'await supabase.auth.signUp');
lg = lg.replace(/await auth\.sendPasswordResetEmail/g, 'await supabase.auth.resetPasswordForEmail');
fs.writeFileSync('components/LoginModal.tsx', lg, 'utf-8');

// 5. PixPaymentModal.tsx
let px = fs.readFileSync('components/PixPaymentModal.tsx', 'utf-8');
px = px.replace(/import \{ db \} from '\.\.\/services\/supabase';\n/g, "import { supabase } from '../services/supabase';\n");
fs.writeFileSync('components/PixPaymentModal.tsx', px, 'utf-8');

// 6. ProductModal.tsx
let pm = fs.readFileSync('components/ProductModal.tsx', 'utf-8');
pm = pm.replace(/import firebase from 'firebase\/compat\/app';\n/g, "import { User } from '@supabase/supabase-js';\n");
pm = pm.replace(/user: firebase\.User \| null;/g, 'user: User | null;');
fs.writeFileSync('components/ProductModal.tsx', pm, 'utf-8');

// 7. SiteCustomizationTab.tsx
let sc = fs.readFileSync('components/SiteCustomizationTab.tsx', 'utf-8');
sc = sc.replace(/arrayMove\(formData\.contentSections, oldIndex, newIndex\)/g, 'arrayMove<ContentSection>(formData.contentSections, oldIndex, newIndex)');
sc = sc.replace(/arrayMove\(\(formData\.footerLinks \|\| \[\]\), oldIndex, newIndex\)/g, 'arrayMove<FooterLink>((formData.footerLinks || []), oldIndex, newIndex)');
fs.writeFileSync('components/SiteCustomizationTab.tsx', sc, 'utf-8');

console.log('Fixed ALL remaining TS errors!');
} catch(e) {
  console.error("Error executing replacements:", e);
}
