(function(){
	
	var game, com;

	$(function(){
		$('#play').click(function(){
			var name = $('#name').val();
			start(name);
		});
	});
	
	
	/**
	 *
	 */
	
	function start(name) {
		
		$('.login').toggle();
		$('.game').toggle();
		
		var canvas = $('#canvas')[0];
			
		game = new Game(canvas, name);
		
		com = new Communicator(name);
		com.connect();
		
		$.subscribe('playerUpdated', function(player){
			com.send(player);
		});
		
		com.messageReceived = function(message) {
			console.log(arguments);
			game.playerUpdated(message.s);
		};
	}
	
	
	
	
	/**
	 * 
	 */
	
	function Game(canvas, name) {
	
		function Player(pname) {
			this.id = false;
			this.x = Math.floor(Math.random()*(w-10)) + 0.5;
			this.y = Math.floor(Math.random()*(h-10)) + 0.5;
			this.d = 0;
			this.v = 100;
			this.w = 10;
			this.h = 10;
			this.name = pname;
			this.color = '#0000ff';
		}
		Player.prototype.update = function(){
			
			if (keys[KEY_UP]) {
				this.v += 5;
			}
			else if (keys[KEY_DOWN]) {
	      			this.v -= 8;
			}
		else {
			this.v -= 5;
		}
			
			if (keys[KEY_RIGHT]) {
				this.d += 3;
			}
			else if (keys[KEY_LEFT]) {
				this.d -= 3;
			}
			
			this.v = forceRange(this.v, 0, 100);
			
			this.x += (Math.cos(degToRad(this.d)) * this.v) / targetFPS;
			this.y += (Math.sin(degToRad(this.d)) * this.v) / targetFPS;
			
			if (this.y > h + 15)
				this.y = 0 - 10;
			else if (this.y < 0 - 15)
				this.y = h + 10;
			
			if (this.x > w + 15)
				this.x = 0 - 10;
			else if (this.x < 0 - 15)
				this.x = w + 10;
		};
		Player.prototype.draw = function(){
			ctx.save();
			ctx.translate(this.x + this.w/2, this.y + this.h/2);
			
			ctx.fillStyle = this.color;
			ctx.fillRect(this.w/-2, this.h/-2, this.w, this.h);
			
			ctx.fillStyle = '#000000';
			ctx.textBaseline = 'bottom';
			ctx.fillText(this.name, this.w/2 + 3, this.h/-2);
			
			ctx.strokeStyle = '#000000';
			ctx.beginPath();
			ctx.moveTo(0,0);
			ctx.lineTo(
				(Math.cos(degToRad(this.d)) * this.v) / (targetFPS / 5),
				(Math.sin(degToRad(this.d)) * this.v) / (targetFPS / 5)
			);
			ctx.closePath();
			ctx.stroke();
			
			ctx.restore();
		};
		
		var ctx = canvas.getContext('2d'),
			players = [], 
			w = canvas.width, 
			h = canvas.height,
			me = new Player(name),
			targetFPS = 60,
			
			broadcast = _.throttle(function(){$.publish('playerUpdated', [me]);}, 200),
			
			KEY_LEFT = 37,
			KEY_UP = 38,
			KEY_RIGHT = 39,
			KEY_DOWN = 40,
			keys = {};
		
		// setup input
		$("body").focus()
			.keyup(function(ev){
				keys[ev.which] = false;
			})
			.keydown(function(ev){
				keys[ev.which] = true;
			});
		
		me.color = '#ff0000'
		
		animloop();
		gameloop();
		
		function gameloop() {
			me.update();
			for (var i = 0, l = players.length; i < l; i++) {
				players[i].update();
			}
			broadcast();
			setTimeout(gameloop, 1000/targetFPS);
		}
		
		function animloop() {
			// clear
			ctx.clearRect(0,0,w,h);
			
			// render players
			for (var i = 0, l = players.length; i < l; i++) {
				players[i].draw();
			}
			
			me.draw();
			
			requestAnimFrame(animloop, canvas);
		}
		
		this.playerUpdated = function(player) {
			console.log('player updated', player);
			if (player && player.name) {
				player.color = '#0000ff';
				//var i = _(players).chain().pluck('id').indexOf(player.id).value();
				var i = _(players).chain().pluck('name').indexOf(player.name).value();
				if (i !== undefined && i > -1) 
					players[i] = _.extend(players[i], player);
				else
					players.push(_.extend(new Player(player.name), player));
			}
		};
	}
	
	
	
	/**
	 * 
	 */
	
	function Communicator(name) {
		var that = this;
		this.url = "<%= req.header('host').replace(':8000','') %>";
		this.socket = new io.Socket(this.url);
		this.name = name;
		this.socket.on('connect', function(){ that.socketConnected.apply(that, arguments); });
		this.socket.on('message', function(){ that.messageReceived.apply(that, arguments); });
		this.socket.on('disconnect', function(){ that.socketDisconnected.apply(that, arguments); });
	}
			
	Communicator.prototype = {
	
		connect: function() {
			this.socket.connect();
		},
		
		socketConnected: function() {
			console.log('connected to host ' + this.url);
			console.log('connected', arguments);
			this.send({'name':this.name});
		},
		
		messageReceived: function(message) {
			console.log('message', arguments);
		},
		
		socketDisconnected: function() {
			console.log("disconnected from host " + this.url);
		},
		
		send: function(message) {
			this.socket.send(message);
		}
	};
	
	
	
	/**
	 * Random utilities
	 */
	
	function forceRange(num, min, max) {
		return Math.max(Math.min(num, max), min);
	}
	
	function degToRad(deg) {
		//return (Math.PI/180) * deg;
		return 0.0174533 * deg;
	}
	
	
	/**
	 * requestAnimationFrame shim. Thanks Paul!
	 */
	
	window.requestAnimFrame = (function(){
      return  window.requestAnimationFrame       || 
              window.webkitRequestAnimationFrame || 
              window.mozRequestAnimationFrame    || 
              window.oRequestAnimationFrame      || 
              window.msRequestAnimationFrame     || 
              function(/* function */ callback, /* DOMElement */ element){
                window.setTimeout(callback, 1000 / 60);
              };
    })();
    
    
    
	/**
	 * PubSub FTW!
	 */
    
    (function(d){
		var cache = {};
	
		d.publish = function(/* String */topic, /* Array? */args){
			cache[topic] && d.each(cache[topic], function(){
				this.apply(d, args || []);
			});
		};
	
		d.subscribe = function(/* String */topic, /* Function */callback){
			if(!cache[topic]){
				cache[topic] = [];
			}
			cache[topic].push(callback);
			return [topic, callback]; // Array
		};
	
		d.unsubscribe = function(/* Array */handle){
			var t = handle[0];
			cache[t] && d.each(cache[t], function(idx){
				if(this == handle[1]){
					cache[t].splice(idx, 1);
				}
			});
		};
	
	})(jQuery);
})();
