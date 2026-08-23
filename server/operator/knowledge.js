const fs = require('fs');
const path = require('path');

const MODE_MODULES = {
  ask: ['permanent-doctrine', 'levi-voice', 'recognition-psychology'],
  create: ['permanent-doctrine', 'levi-voice', 'recognition-psychology', 'content-frameworks', 'platform-rules', 'offers-sales'],
  analyze: ['permanent-doctrine', 'recognition-psychology', 'content-frameworks', 'platform-rules', 'offers-sales'],
  monetize: ['permanent-doctrine', 'levi-voice', 'recognition-psychology', 'offers-sales'],
  learn: ['permanent-doctrine', 'content-frameworks', 'platform-rules'],
};

function loadKnowledge(mode) {
  return (MODE_MODULES[mode] || MODE_MODULES.ask).map(name => {
    const content = fs.readFileSync(path.join(__dirname, 'knowledge', `${name}.md`), 'utf8');
    return { name, content };
  });
}

module.exports = { MODE_MODULES, loadKnowledge };