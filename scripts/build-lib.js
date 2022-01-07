/**
 * @author W014ara
 * @version 1.0.0
 * NODEJS version >= 14.15.4
 * npm i ncp
 * npm i glob
 */

const { exec } = require('child_process');
const fs = require('fs');
const glob = require('glob');
const ncp = require('ncp').ncp;

const OUTPUT_PATH = './dist';
const INPUT_PATH = './src/lib';

/**
 * A class intended for building a library located at @INPUT_PATH
 */
class Builder {
  timers = [];

  set timers(value) {
    this.timers = value;
  }

  get timers() {
    return this.timers;
  }

  clearTimers() {
    this.timers.forEach((item) => {
      clearTimeout(item);
    });
    this.timers = [];
  }

  /**
   * The method copies the library directory to the @OUTPUT_PATH  with subsequent processing
   * of preprocessor files in CSS format
   * @param inputPath - Path to the original library
   * @param outputPath - The path where the library should locate
   */
  setLibCopy(inputPath, outputPath) {
    fs.rmdirSync(outputPath, { recursive: true });
    ncp(inputPath, outputPath, (error) => {
      if (error) {
        console.log(error);
        return 0;
      }
      this.convertStyles(outputPath);
    });
  }

  /**
   * The method searches for sass(scss) files in the library directory, after which it converts
   * them to a standard css
   * @param outputPath - The path where the files should locate
   * @implements SASS-module
   */
  convertStyles(outputPath) {
    let finishedPromises = [];

    glob(`${outputPath}/**/*.scss`, (er, files) => {
      files.forEach((file) => {
        let splitted = file.split('/');
        splitted[splitted.length - 1] = splitted[splitted.length - 1].replace('.scss', '');
        splitted = splitted.join('/');

        let command = `sass --update ${file}:${splitted}.css --style compressed --no-source-map`;
        let execCommand = new Promise((resolve, reject) => {
          exec(command);
          resolve(file);
          reject(file);
        })
          .then((file) => {
            console.log(`${file} \twas updated to`, `\t${splitted}.css`, `\n`);
          })
          .catch((file) => {
            console.log(`Error in ${file}`, `\n`);
          });
        finishedPromises.push(execCommand);
      });

      Promise.all(finishedPromises).then(() => {
        let timerId;
        files.forEach((file) => {
          timerId = setTimeout(() => {
            fs.unlink(file, () => {});
          }, 1000);
        });

        this.timers.push(timerId);
      });

      this.updateTSX(outputPath);
    });
  }

  /**
   * The method converts all styles of sass to css (dependencies in *.TSX components)
   * @param outputPath  - The path where the files should locate
   */
  updateTSX(outputPath) {
    glob(`${outputPath}/**/*.tsx`, (er, files) => {
      files.forEach((file) => {
        let target = fs.createReadStream(file, 'utf8');
        let newCss = '';

        target.on('data', function (chunk) {
          let pattern = /\S+.scss/g;
          newCss = chunk.toString();

          let results = newCss.match(pattern);

          if (!results) {
            return 0;
          }

          results.forEach((item) => {
            let replaced = item.replace('.scss', '.css');
            newCss = newCss.replace(item, replaced);
          });
        });

        target.on('end', function () {
          fs.writeFile(file, newCss, function (err) {
            if (err) {
              console.log(err);
            }
          });
        });
      });
    });
  }

  /**
   * The main method of the program. Carries out the transfer of files to the required directory.
   * Produces compilation of js, ts, tsx, sass (scss) files to js and css
   * @param inputPath - Path to the original library
   * @param outputPath - The path where the library should locate
   */
  build(inputPath, outputPath) {
    let copyPromise = new Promise((resolve, reject) => {
      this.setLibCopy(inputPath, outputPath);

      resolve('Files started processing ');
      reject('Error with copied files');
    });

    copyPromise
      .then((msg) => {
        console.log(msg);
      })
      .catch((err) => {
        console.log(err);
      });

    Promise.all([copyPromise]).then(() => {
      const execOutDir = outputPath.split('./');

      exec(
        `NODE_ENV=production babel ${outputPath} --out-dir ${
          execOutDir[execOutDir.length]
        } --extensions .ts,.tsx --copy-files`,
      );
      this.clearTimers();
    });
  }
}

const builder = new Builder();

builder.build(INPUT_PATH, OUTPUT_PATH);
