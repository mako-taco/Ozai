function Ozai(obj) {
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
			}
		}

		for(name in obj) {
			self[name] = (function(i) {
				return function() {
					//check argument validity
					for(var j=0; j<arguments.length-1; j++) {
						//if there is a callback, add it to the map of cbs.
						//only last arg can be a callback
						if(isFunction(arguments[j])) {
							throw "Cannot pass non-callback functions directly to a worker. \
							Callbacks must be passed as the final argument to this function.";
						}					
					}

					//register callback if one exists
					var id = makeID();
					var lastArg = arguments[arguments.length-1];
					if(isFunction(lastArg)) {
						worker.callbacks[id] = lastArg;
						arguments = Array.prototype.slice.call(arguments, 0, arguments.length-1);
					}
					
					var msg = {
						id: id,
						fn: i,
						args: arguments
					};

					//send data to thread
					worker.postMessage(msg);
				}
			})(name);
		}
	}

	__init__();
}