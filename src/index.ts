import app from './server';
import config from '../config';

// Start the application by listening to specific port
const port = Number(process.env.PORT || config.apiServer.port || 8080);
app.listen(port, () => {
  console.info('Express application started on port: ' + port);
});

