const { exec } = require('child_process');
const ncp = require('ncp').ncp;
const glob = require('glob');
const fs = require('fs');

function copyLibToDist() {
  fs.rmdirSync('./dist', { recursive: true });
  ncp('./src/lib', './dist', (error) => {
    setSASStoCSS();
  });
}

function setSASStoCSS() {
  glob(`./dist/**/*.scss`, (er, files) => {
    files.forEach((file) => {
      let splitted = file.split('/');
      splitted[splitted.length - 1] = splitted[splitted.length - 1].replace('.scss', '');
      splitted = splitted.join('/');
      let command = `sass --update ${file}:${splitted}.css --style compressed --no-source-map`;
      setTimeout(() => {
        exec(command);
      }, 100);
    });

    setTimeout(() => {
      files.forEach((file) => {
        fs.unlink(file, () => {});
      });
    }, 5000);

    updateTSX();
  });
}

function updateTSX() {
  glob('./dist/**/*.tsx', (er, files) => {
    let options = {
      files: [],
    };

    files.forEach((file) => {
      let target = fs.createReadStream(file, 'utf8');
      let newCss = '';

      target.on('data', function (chunk) {
        let pattern = /\S+.scss/g;
        newCss = chunk.toString();

        let results = newCss.match(pattern);

        results.forEach((item) => {
          let replaced = item.replace('.scss', '.css');
          newCss = newCss.replace(item, replaced);
        });
      });

      target.on('end', function () {
        fs.writeFile(file, newCss, function (err) {
          if (err) {
            return console.log(err);
          } else {
            console.log('TSX Updated!');
          }
        });
      });
    });
  });
}

function build() {
  copyLibToDist();
  exec('NODE_ENV=production babel ./dist --out-dir dist --extensions .ts,.tsx --copy-files');
}

build();
