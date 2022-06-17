const Grid = require('./Grid');
const mongoose = require('mongoose');

async function main() {
  console.log('Connecting...');
  const connection = mongoose.createConnection(
      'mongodb://localhost:27017/fsmetadata',
  );
  const gfs = new Grid(connection, 'gridfs-local-files');

  console.log('Writing...');
  const outputStream = gfs.createWriteStream({
    filename: 'example.txt',
  });

  const TEST_STRING = 'Hello, world!';

  const file = await new Promise((resolve, reject) => {
    outputStream.on('err', (err) => {
      return reject(err);
    });
    outputStream.on('close', (file) => {
      return resolve(file);
    });

    outputStream.write(TEST_STRING);
  });

  await file.save();

  const inputStream = gfs.createReadStream({_id: file._id});

  console.log('Reading...');
  const data = await new Promise((resolve, reject) => {
    let content = '';
    inputStream.on('data', (chunk) => {
      content = content + chunk;
    });
    inputStream.on('error', (err) => {
      console.error(err);
      return reject({
        Error: 'Failed to retrieve file content.',
      });
    });
    inputStream.on('close', () => {
      if (content == null) {
        return reject({
          error: 'Failed to retrieve file content. 2',
        });
      } else {
        return resolve(content);
      }
    });
    inputStream.run();
  });

  if (data !== TEST_STRING) {
    throw new Error('Content mismatch.');
  } else {
    console.log('File read successfully.');
  }

  console.log('Removing...');
  await new Promise((resolve, reject) => {
    gfs.remove({_id: file._id}, (err) => {
      if (err) {
        return reject(err);
      }
      return resolve(null);
    });
  });
}

main()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(-1);
    });
