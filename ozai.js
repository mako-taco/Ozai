/*Copyright (c) 2013 Jake Scott
Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in 
the Software without restriction, including without limitation the rights to 
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in 
	all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE. */

var Ozai = function (obj) {
	var worker;
	var self = this;
	
	/* Thank you, broofa.
	 * http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript */
	var makeID = function() {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
			return v.toString(16);
		});
	}

	var __init__ = function() {

		//build the worker script node
		var workerScript = 
			"scopeObj = {};												\
			\nself.onmessage = function(e) { 							\
			\n 	var msg = e.data;										\
			\n	var id = msg.id;										\
			\n	var fn = msg.fn;										\
			\n	var args = msg.args										\
			\n		.concat([ function() {								\
			\n			self.postMessage({args: arguments, id: id});	\
			\n		}]);												\
			\n 	scopeObj[fn].apply(scopeObj,args);						\
			\n}";
		
		//create functions for this thread to call
		var isFunction = function(obj) {
			return !!(obj && obj.constructor && obj.call && obj.apply);
		};

		for(var i in obj) {
			if(isFunction(obj[i]))
				workerScript +=	"\nscopeObj['" + i + "'] = " +	obj[i].toString();
			else
				workerScript +=	"\nscopeObj['" + i + "'] = " + JSON.stringify(obj[i]);
		}

		//create worker from script node
		if(window.Worker) {
			var script = new Blob([workerScript], {type: 'text/javascript'});
			worker = new Worker(window.URL.createObjectURL(script));
			worker.callbacks = {};
			worker.onmessage = function(e) {
				var msg = e.data;
				if(msg.err) {
					console.log(msg.err);
				}
				else if(worker.callbacks[msg.id]){
					var argArray = [];
					for(a in msg.args) {
						argArray.push(msg.args[a]);
					}
					worker.callbacks[msg.id].apply(worker.callbacks[msg.id], argArray);
					delete worker.callbacks[msg.id];
				}
			}
			for(name in obj) {
				self[name] = (function(fnName) {
					return function() {var id = makeID();
						var lastArg = arguments[arguments.length-1];
						if(isFunction(lastArg)) {
							worker.callbacks[id] = lastArg;
							arguments = Array.prototype.slice.call(arguments, 0, arguments.length-1);
						}
						else {
							arguments = Array.prototype.slice.call(arguments, 0);
						}

						for(var i=0; i<arguments.length; i++) {
							if(isFunction(arguments[i])) {
								arguments[i] = arguments[i].toString();
								arguments[i].__isFn__ = true;
							}
							arguments[i].__isFn__ = false;	
						}
						
						var msg = {
							id: id,
							fn: fnName,
							args: arguments
						};

						//send data to thread
						worker.postMessage(msg);
					}
				})(name);
			}
		}
		//Poly fill for no webworker support.  
		else {
			for(name in obj) {
				if(isFunction(obj[name])) {
					//strips closure vars from the function, like creating the 
					//webworker would be doing if it was supported.
					var txt = obj[name].toString();
					var args = (/function\s*\(([\s\S]*?)\)/gi).exec(txt)[1];
					var fnString = txt.replace(/function[\s\S]*?{/,'').slice(0, -1);
					self[name] = new Function(args.replace(/\s+/gi,''), fnString);
				}
				else {
					self[name] = obj[name];
				}
			}
		}

	}
	__init__();
}