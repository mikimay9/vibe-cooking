
const start = Date.now();
console.log('Fetching API...');

fetch('https://vibe-cooking-xi.vercel.app/api/patrol')
    .then(res => {
        console.log(`Status: ${res.status}`);
        return res.json();
    })
    .then(data => {
        const duration = (Date.now() - start) / 1000;
        console.log(`Duration: ${duration}s`);
        console.log(`Recipes: ${data.recipes?.length}`);
        if (data.recipes?.length > 0) {
            console.log('Sample:', data.recipes[0].title);
        }
    })
    .catch(err => {
        const duration = (Date.now() - start) / 1000;
        console.log(`Error after ${duration}s:`, err.message);
    });
