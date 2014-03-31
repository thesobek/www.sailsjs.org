var spawn = require('child_process').spawn;
var fs = require('fs-extra');

/************************************************************************/
/* * * * * * * * * * * * *   Script Options   * * * * * * * * * * * * * */
/************************************************************************/

var docsRepo = 'git://github.com/balderdashy/sails-docs.git';

// Markdown converter options
muOptions = {
	gfm: true,
	tables: true,
	breaks: true,
	pedantic: false,
	sanitize: true,
	smartLists: true,
	smartypants: false,
	langPrefix: 'lang-'
};

// Make templates for "Anatomy of a Sails App" as well as reference?

var cwd = require('path').dirname(require.main.filename);
var getDocsDir = docsRepo.split('/');
var docsDir = getDocsDir[getDocsDir.length - 1].replace('.git', '');


var parseThese = {
	reference: {
		dirName: 'reference',
		parseThis: true,
		addToSitemap: true,
		saveDirectory: cwd + '/assets/templates/reference/',
		dirInDocs: cwd+'/'+docsDir+'/reference'
	},
	anatomy: {
		dirName: 'anatomy',
		parseThis: true,
		addToSitemap: true,
		saveDirectory: cwd + '/assets/templates/anatomy/',
		dirInDocs: cwd+'/'+docsDir+'/anatomy'
	}
};


//var templatesDirPath = cwd + '/assets/templates/reference/';
//var anatomyDirPath = cwd + '/assets/templates/anatomy/';



/************************************************************************/
/* * * * * * * * * * * * *   Now Get To Work  * * * * * * * * * * * * * */
/************************************************************************/

var Ejs = function Ejs(savePath, md) {
	
	var convertToHTML = require('marked');

	if (md.substr(0,1) !== '#')
		md = '#'+md;

	convertToHTML(md, muOptions, function finishedConverting (err, html) {
		if (err) throw err;

		// Perform some HTML transformations:
		html = transformHTML(html, function (errors, transformedHTML) {
			if (errors) throw errors;

			fs.outputFile(savePath + '.html', transformedHTML, function writeCB(err) {
				if (err) {
					console.error('Error writing file:', err);
					// throw new Error('rrrrrrrr'+err);
				}

				// If successul, do nothing.
			});
		});

	});
};

var siteMap = {
	pages : [],
	addTheseToo : ['#!getStarted','#!documentation','#!'], // Additional Files to be added to siteMap
	generate: function generateSiteMap(path){
		var prependThis = 'http://sailsjs.org/#!documentation/reference/';
		var buffIt = '<?xml version="1.0" encoding="utf-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n\t';
		for (var i=0;i<this.pages.length;i++){
			var routeName = this.pages[i];
			buffIt+='\n\t<url>\n\t\t<loc>'+prependThis+routeName+'</loc>\n\t</url>';
		}

		for (var i=0;i<this.addTheseToo.length;i++){
			var routeName = this.addTheseToo[i];
			buffIt+='\n\t<url>\n\t\t<loc>http://sailsjs.org/'+routeName+'</loc>\n\t</url>';
		}

		buffIt+='\n</urlset>';

		fs.writeFileSync(cwd + '/sitemap.xml', buffIt);

	}

}

function splitMD(fileArray,whichDir) {
//console.log(fileArray+'whichDir:'+whichDir);
	// Split each markdown file at the single hash header line
	// then send each section to be parsed and saved as a seperate html file

	var parseOptionRef = parseThese[whichDir];
	var savePath = parseOptionRef.saveDirectory;
	var dirInDocs = parseOptionRef.dirInDocs;

	var cutItUp = function cutItUp(mdFileName,index) {
//		console.log('Im in dir '+require('path').dirname(require.main.filename));


//			if (err){
//				return new Error(err);
//			} else {
				var makeDirName = mdFileName.replace(/\.md/g, '').replace(/\s/g, '').replace(/[^a-zA-Z0-9 ]+/g, '');
				var newDir = savePath + makeDirName;


				var path = newDir + '/';
				var dirName = makeDirName;
		
				var bigFile = fs.readFileSync(dirInDocs+'/'+mdFileName, 'utf8');
//				var splitFiles = bigFile.split(/[^!#\'>"]#[^!#\'>"]/ig);
				var splitFiles = bigFile.split(/\n{0,1}[^#]#\s/ig);

				splitFiles.forEach(function(v, i) {
					try {

					var firstLine = v.match(/([^]+?)\n/)[0];
					} catch(error){
						console.log(error);
						var firstLine = 'Title Parsing Error';

					}
					var getFileName = firstLine.replace(/[\r\t\n\s`#]/ig, '');

					// Allows Function notation in titles
					if (getFileName.match(/[\(]/)){
						try {

						getFileName = getFileName.split('(')[0];						
						} catch(error){
							console.log('Problem splitting:',error)
						}
					}

					// For Dynamic Finders
					if (getFileName.match(/[<]/))
						getFileName = getFileName.replace(/<[^]+?>/ig,'');

					if (parseOptionRef.addToSitemap)
						siteMap.pages.push(dirName+'/'+getFileName);
				//	console.log('Path: '+path+'\ngetFileName:'+getFileName);
					new Ejs(path+getFileName.replace(/\./g,'_d_'), v);
				});

//			}
//			cutItUp(newDir + '/', makeDirName, data);
	};

//console.log('Im in dir '+require('path').dirname(require.main.filename));

	fileArray.forEach(cutItUp)

}



// If the repo 'sails-docs' exists locally, chdir to it then 'git pull'
// If it doesnt exist, 'git clone' it

function doClone(err, files) {

	if (err) return new Error();

	console.log('Grabbing the repo.  Hold up.');

	var splitAllDeez = function splitAllDeez(whichDir) {
		var parseOptionRef = parseThese[whichDir];
		var savePath = parseOptionRef.saveDirectory;

		// Make a new blank Templates folder and send big MD files
		// to be split into smaller HTML files

		fs.mkdirSync(savePath);
		
		var pathToMDs = cwd + '/' + docsDir + '/'+whichDir+'/';
		console.log('Path to MDs for '+whichDir+' is '+pathToMDs);
		process.chdir(pathToMDs);
		fs.readdir(pathToMDs, function getFileList(err, files) {
			if (err)
				return new Error(err);
			var listOfMDs = [];

			// If it is an MD file, split it and mark it up
			files.forEach(function(v,index) {
				if (v.match(/\.md/i))
					listOfMDs.push(v);
				if (index === files.length-1){
					console.log('Found names of all MDs.  Sending them off to be split.');
					splitMD(listOfMDs,whichDir);					
				}

			});

		});
	};


	var delDir = function delDir(whichDir,cb){
		var parseOptionRef = parseThese[whichDir];
		var savePath = parseOptionRef.saveDirectory;

		if (fs.existsSync(savePath)) {
			var rmTemplates = spawn('rm', ['-R', savePath]);
			rmTemplates.stdout.on('data', function(d) {
				console.log('\nInfo:' + d);
			});
			rmTemplates.stderr.on('data', function(d) {
				console.log('\nError:' + d);
			});
			rmTemplates.on('close', function(code) {
				if (code === 0){
					return cb(null,whichDir);
				} else {
					return cb(new Error(d),null);
				}
			});
		} else {
			console.log('Directory '+whichDir+' doesnt exist');
			return cb(null,whichDir);
		}
	}


	var cloneRepo;
	if (files.indexOf(docsDir) > -1) {
		console.log('The repo already exists locally. Lets check for updates!');
		process.chdir('sails-docs');
		cloneRepo = spawn('git', ['pull']);
		process.chdir('..');
	} else {
		console.log('The repo doesn\'t exist.  Lets clone it!');
		cloneRepo = spawn('git', ['clone', docsRepo]);
	}

	cloneRepo.stdout.on('data', function(d) {
		console.log('\nInfo:' + d);
	});
	cloneRepo.stderr.on('data', function(d) {
		console.log('\nError:' + d);
	});
	cloneRepo.on('close', function(code) {
		if (code === 0) {

			// Remove the templates directory if it exists then create an empty one.

			for (dir in parseThese){
				var parseOptionRef = parseThese[dir];
				if (parseOptionRef.parseThis === true){
					console.log('Trying to delete directory:'+dir)
					delDir(dir, function timeToSplit(err,whichDir){
						if (err)
							console.log('Error:'+JSON.stringify(err));
						else
							splitAllDeez(whichDir);
					})
				}
			}

		} else {
			console.log('Sorry Homie.  The building collapsed and i\'m left holding exit code ' + code);
		}
	});
}

// Read files in CWD.  Spit them into doClone
fs.readdir(cwd, doClone);

// Generate the sitemap on exit
process.on('exit', function makeSiteMap() {
	siteMap.generate();
	console.log('Sitemap written.  Exiting');
});














/**
 * Transform some stuff in the HTML.
 *
 *  - turn emoji into relevant classes on their containers
 *
 * @param  {[type]} html [description]
 */
function transformHTML (html, cb) {
	// td.yes
	// td.notyet.no
	// td.never

	// - :white_check_mark: - supported feature
	//  - :white_large_square: - feature not yet implemented for this transport
	//  - :heavy_multiplication_x: - unsupported feature due to protocol restrictions
	//  

	var JQUERY = require('jquery');

	// first argument can be html string, filename, or url
	require('jsdom').env(html, function (errors, window) {
		if (errors) return cb(errors);
		
		var $ = JQUERY(window);

		//
		// Replace text nodes and add CSS class(es)
		// 
		
		$('td:contains("white_check_mark")').addClass('yes');
		$('td:contains("white_check_mark")').text('');

		$('td:contains("white_large_square")').addClass('no').addClass('notyet');
		$('td:contains("white_large_square")').text('');

		$('td:contains("heavy_multiplication_x")').addClass('never');
		$('td:contains("heavy_multiplication_x")').text('');

		// Convert transformed HTML into a string and send it back
		var transformedHTML = window.document.documentElement.outerHTML;
		cb(null, transformedHTML);
	});

}