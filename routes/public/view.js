
const db = require('../../connectors/db');

module.exports = function (app) {
  //Register HTTP endpoint to render /index page
  app.get('/', function (req, res) {
    return res.render('index');
  });
  // example of passing variables with a pages
  app.get('/register', async function (req, res) {
    const stations = await db.select('*').from('stations');
    return res.render('register', { stations });
  });
};
