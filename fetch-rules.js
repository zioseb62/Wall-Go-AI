const fetch = require('node-fetch');
fetch('https://spielstein.com/games/fendo/rules').then(r => r.text()).then(t => {
    const text = t.replace(/<[^>]*>?/gm, ' ');
    console.log(text.substring(0, 1500));
});
