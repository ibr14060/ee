const db = require('../../connectors/db');
const roles = require('../../constants/roles');
const { getSessionToken } = require('../../utils/session');

const getUser = async function (req) {
  const sessionToken = getSessionToken(req);
  if (!sessionToken) {
    return res.status(301).redirect('/');
  }

  const user = await db.select('*')
    .from('sessions')
    .where('token', sessionToken)
    .innerJoin('users', 'sessions.userid', 'users.id')
    .innerJoin('roles', 'users.roleid', 'roles.id')
    .first();

  console.log('user =>', user)
  user.isUser = user.roleid === roles.user;
  user.isAdmin = user.roleid === roles.admin;
  user.isSenior = user.roleid === roles.senior;

  return user;
}

module.exports = function (app) {
  // Register HTTP endpoint to render /users page
  app.get('/dashboard', async function (req, res) {
    const user = await getUser(req);
    const y = await db('subscription').where('userid', user.userid);
    const isSubscribed = y.length === 0 ? false : true;
    return res.render('dashboard', { user, isSubscribed });
  });

  app.get('/dashboardx', async function (req, res) {
    const user = await getUser(req);
    return res.render('dashboard', user);
  });

  app.get('/create_station', async function (req, res) {
    const user = await getUser(req);
    return res.render('create_station', user);
  });

  app.get('/purchase_online', async function (req, res) {
    const user = await getUser(req);
    return res.render('purchase_online', user);
  });

  app.get('/request_arefund', async function (req, res) {
    const user = await getUser(req);
    return res.render('request_arefund', user);
  });
  app.get('/request_a_senior', async function (req, res) {
    const user = await getUser(req);
    return res.render('request_a_senior', user);
  });

  app.get('/create_route', async function (req, res) {
    const user = await getUser(req);
    return res.render('create_route', user);
  });

  const isSub = async function (req, res) {
    const user = await getUser(req);
    const y = await db('subscription').where('userid', user.userid);
    const isSubscribed = y.length === 0 ? false : true;
    return res.render('purchase', { user, isSubscribed });
  }

  app.get('/purchase', isSub);

  app.get('/users/add', async function (req, res) {
    return res.render('add-user');
  });

  // Register HTTP endpoint to render /users page
  app.get('/users', async function (req, res) {
    const users = await db.select('*').from('users');
    const user = await getUser(req);

    return res.render('users', { users, ...user });
  });

  // Register HTTP endpoint to render /courses page
  app.get('/stations_example', async function (req, res) {
    const user = await getUser(req);
    const stations = await db.select('*').from('stations');
    return res.render('stations_example', { ...user, stations });
  });

  app.get('/routes', async function (req, res) {
    const user = await getUser(req);
    const routes = await db.select('*').from('routes');
    return res.render('routes', { ...user, routes });
  });
  app.get('/admin_refund_requests', async function (req, res) {
    const user = await getUser(req);
    return res.render('admin_refund_requests', user);
  });
  app.get('/admin_senior_requests', async function (req, res) {
    const user = await getUser(req);
    return res.render('admin_senior_requests', user);
  });
  app.get('/tickets', async function (req, res) {
    const user = await getUser(req);
    return res.render('tickets', user);
  });
};
