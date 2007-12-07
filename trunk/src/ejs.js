/*--------------------------------------------------------------------------
 *  EJS - Embedded JavaScript, version 0.1.0
 *  Copyright (c) 2007 Edward Benson
 *  http://www.edwardbenson.com/projects/ejs
 *  ------------------------------------------------------------------------
 *
 *  EJS is freely distributable under the terms of an MIT-style license.
 *
 *  EJS is a client-side preprocessing engine written in and for JavaScript.
 *  If you have used PHP, ASP, JSP, or ERB then you get the idea: code embedded
 *  in [% // Code here %] tags will be executed, and code embedded in [%= .. %] 
 *  tags will be evaluated and appended to the output. 
 * 
 *  This is essentially a direct JavaScript port of Masatoshi Seki's erb.rb 
 *  from the Ruby Core, though it contains a subset of ERB's functionality. 
 * 
 *  Requirements:
 *      prototype.js
 * 
 *  Usage:
 *      // source should be either a string or a DOM node whose innerHTML
 *      // contains EJB source.
 *  	var source = "[% var ejb="EJB"; %]<h1>Hello, [%= ejb %]!</h1>"; 
 *      var compiler = new EjsCompiler(source);		
 *	    compiler.compile();	
 *	    var output = eval(compiler.out);
 *      alert(output); // -> "<h1>Hello, EJB!</h1>"
 *       
 *  For a demo:      see demo.html
 *  For the license: see license.txt
 *
 *--------------------------------------------------------------------------*/

/* Make a split function like Ruby's: "abc".split(/b/) -> ['a', 'b', 'c'] */
String.prototype.rsplit = function(regex) {
	var item = this;
	result = regex.exec(item);
	var retArr = new Array();
	while (result != null)
	{
		var first_idx = result.index;
		var last_idx = regex.lastIndex;
		if ((first_idx) != 0)
		{
			var first_bit = item.substring(0,first_idx);
			retArr.push(item.substring(0,first_idx));
			item = item.slice(first_idx);
		}		
		retArr.push(result[0]);
		item = item.slice(result[0].length);
		result = regex.exec(item);	
	}
	if (! item.empty())
	{
		retArr.push(item);
	}
	return retArr;
};

/* Chop is nice to have too */
String.prototype.chop = function() {
	return this.substr(0, this.length - 1);
}

/* Adaptation from the Scanner of erb.rb  */
var EjsScanner = Class.create();
EjsScanner.prototype = {
  initialize: function(source) {
      this.SplitRegexp = /(\[%%)|(%%\])|(\[%=)|(\[%#)|(\[%)|(%\]\n)|(%\])|(\n)/;
      this.source = source;
	  this.stag = null;
  },

  /* For each line, scan! */
  scan: function(block) {
     scanline = this.scanline;
	 regex = this.SplitRegexp;
	 if (! this.source.empty())
	 {
		 this.source.split('\n').each(function(item) {
			 scanline(item, regex, block);
		 });
	 }
  },
  
  /* For each token, block! */
  scanline: function(line, regex, block) {
     line.rsplit(regex).each(function(token) {
       if (token != null) {
         block(token, this);
       }
     });
  }
};

/* Adaptation from the Buffer of erb.rb  */
var EjsBuffer = Class.create();
EjsBuffer.prototype = {
  initialize: function(pre_cmd, post_cmd) {
	this.line = new Array();
	this.script = "";
	this.pre_cmd = pre_cmd;
	this.post_cmd = post_cmd;
	
	for (var i=0; i<this.pre_cmd.length; i++)
	{
		this.push(pre_cmd[i]);
	}
  },
	  
  push: function(cmd) {
	this.line.push(cmd);
  },

  cr: function() {
	this.script = this.script + this.line.join('; ');
	this.line = new Array();
	this.script = this.script + "\n";
  },

  close: function() {
	if (this.line.length > 0)
	{
		for (var i=0; i<this.post_cmd.length; i++)
		{
			this.push(post_cmd[i]);
		}
		this.script = this.script + this.line.join('; ');
		line = null;
	}
  }
 	
};

/* Adaptation from the Compiler of erb.rb  */
var EjsCompiler = Class.create();
EjsCompiler.prototype = {
  initialize: function(source) {
	this.pre_cmd = ['___ejsO = "";'];
	this.post_cmd = new Array();
	this.source = ' ';	
	if (source != null)
	{
		if (typeof source == 'string')
		{
			this.source = source;
		}
		else if (source.innerHTML)
		{
			this.source = source.innerHTML;
		} 
		if (typeof this.source != 'string')
		{
			this.source = "";
		}
	}
	this.scanner = new EjsScanner(this.source);
	this.out = '';
  },
  compile: function() {
	this.out = '';
	var put_cmd = "___ejsO += ";
	var insert_cmd = put_cmd;
	var buff = new EjsBuffer(this.pre_cmd, this.post_cmd);		
	var content = '';
	this.scanner.scan(function(token, scanner) {
		if (scanner.stag == null)
		{
			switch(token) {
				case '\n':
					content = content + "\n";
					buff.push(put_cmd + '"' + content + '"');
					buff.cr()
					content = '';
					break;
				case '[%':
				case '[%=':
				case '[%#':
					scanner.stag = token;
					if (content.length > 0)
					{
						// Chould be content.dump in Ruby
						buff.push(put_cmd + '"' + content + '"');
					}
					content = '';
					break;
				case '[%%':
					content = content + '[%';
					break;
				default:
					content = content + token;
					break;
			}
		}
		else {
			switch(token) {
				case '%]':
					switch(scanner.stag) {
						case '[%':
							if (content[content.length - 1] == '\n')
							{
								content = content.chop();
								buff.push(content);
								buff.cr();
							}
							else {
								buff.push(content);
							}
							break;
						case '[%=':
							buff.push(insert_cmd + "((" + content + ").toString())");
							break;
					}
					scanner.stag = null;
					content = '';
					break;
				case '%%]':
					content = content + '%]';
					break;
				default:
					content = content + token;
					break;
			}
		}
	});
	if (content.length > 0)
	{
		// Chould be content.dump in Ruby
		buff.push(put_cmd + '"' + content + '"');
	}
	buff.close();
	this.out = buff.script + ";";
  }	
}
	