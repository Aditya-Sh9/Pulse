const fetch = require('node-fetch');
fetch('http://localhost:5000/api/activities')
    .then(res => res.json())
    .then(data => {
        console.log(JSON.stringify(data.slice(0, 5), null, 2));
    });
