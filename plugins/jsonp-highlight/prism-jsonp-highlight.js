(function() {
	if ( !self.Prism || !self.document || !document.querySelectorAll ) return;
	var adapters = [];
	function registerAdapter(adapter) {
		if (typeof adapter === 'function' && !getAdapter(adapter)) {
			adapters.push(adapter);
		}
	}
	function getAdapter(adapter) {
		if (typeof adapter === 'function') {
			return adapters.filter(function(fn) { return fn.valueOf() === adapter.valueOf()})[0];
		}
		else if (typeof adapter === 'string' && adapter.length > 0) {
			return adapters.filter(function(fn) { return fn.name === adapter})[0];
		}
		return null;
	}
	function removeAdapter(adapter) {
		if (typeof adapter === 'string')
			adapter = getAdapter(adapter);
		if (typeof adapter === 'function') {
			var index = adapters.indexOf(adapter);
			if (index >=0) {
				adapters.splice(index,1);
			}
		}
	}

	Prism.plugins.jsonphighlight = {
		registerAdapter: registerAdapter,
		removeAdapter: removeAdapter
	};
	registerAdapter(function github(rsp) {
		if ( rsp && rsp.meta && rsp.data ) {
			if ( rsp.meta.status && Number(rsp.meta.status >= 400) ) {
				return "Error: " + ( rsp.data.message || rsp.meta.status );
			}
			else if ( typeof(rsp.data.content) === "string" ) {
				return typeof(atob) === "function"
					? atob(rsp.data.content.replace(/\s/g, ''))
					: "Your browser cannot decode base64";
			}
			else {
				return "No data";
			}
		}
		return null;
	});
	registerAdapter(function bitbucket(rsp) {
		return rsp && rsp.node && typeof(rsp.data) === "string"
			? rsp.data
			: null;
	});

	jsonpcb=0,
	loadstr = "Loading…";

	Array.prototype.slice.call(document.querySelectorAll("pre[data-jsonp]")).forEach(function(pre) {
		var code = document.createElement("code");
		code.textContent = loadstr;
		pre.appendChild(code);

		var adapterfn = pre.getAttribute("data-adapter");
		var adapter = null;
		if ( adapterfn ) {
			if ( typeof(window[adapterfn]) === "function" ) {
				adapter = window[adapterfn];
			}
			else {
				code.textContent = "JSONP adapter function '" + adapterfn + "' doesn't exist";
				return;
			}
		}

		var cb = "prismjsonp" + ( jsonpcb++ );
		
		var uri = document.createElement('a');
		var src = uri.href = pre.getAttribute("data-jsonp");
		uri.href += ( uri.search ? "&" : "?" ) + ( pre.getAttribute("data-callback") || "callback" ) + "=" + cb;

		var timeout = setTimeout(function() {
			// we could clean up window[cb], but if the request finally succeeds, keeping it around is a good thing
			if ( code.textContent === loadstr )
				code.textContent = "Timeout loading '" + src + "'";
		}, 5000);
		
		var script = document.createElement("script");
		script.src=uri.href;

		window[cb] = function(rsp) {
			document.head.removeChild(script);
			clearTimeout(timeout);
			delete window[cb];

			var data = "";
			
			if ( adapter ) {
				data = adapter(rsp);
			}
			else {
				for ( var p in adapters ) {
					data = adapters[p](rsp);
					if ( data !== null ) break;
				}
			}

			if (data === null) {
				code.textContent = "Cannot parse response (perhaps you need an adapter function?)";
			}
			else {
				code.textContent = data;
				Prism.highlightElement(code);
			}
		};

		document.head.appendChild(script);
	});
})();