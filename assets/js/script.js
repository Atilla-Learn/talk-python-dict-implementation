$(function() {
	var CHANGE_ON_CLICK = true;

	Reveal.initialize({
		history: true,
		controls: true,
		progress: true,
		history: true,
		center: true,
		transition: "slide",

		dependencies: [
			{ src: 'assets/revealjs/plugin/math/math.js', async: true },
			{ src: 'assets/revealjs/plugin/highlight/highlight.js', async: true, condition: function() { return !!document.querySelector( 'pre code' ); }, callback: function() { hljs.initHighlightingOnLoad(); } }
		]
	});

	var socket = null;

	var form = $('form.login');
	var secretTextBox = form.find('input[type=password]');
	var presentation = $('.reveal');

	try {
		socket = io();
	}
	catch(err) {
		console.log("socket.io not found, assuming local running");
		presentation.removeClass("blurred");
		form.hide();
	}

	var key = "", animationTimeout;

	// When the page is loaded it asks you for a key and sends it to the server

	form.submit(function(e) {
		e.preventDefault();

		key = secretTextBox.val().trim();

		if (key.length) {
			socket.emit('load', {
				key: key
			});
		}

	});

	// The server will either grant or deny access, depending on the secret key

	if (socket) {
		socket.on('access', function(data){
			if (data.access === "granted") {
				presentation.removeClass('blurred');
				form.hide();

				var ignore = false;

				var clickCount = 0;
				var singleClickTimer;

				// navigate{Next,Prev} on {single,double} click - useful when using fragments
				if (CHANGE_ON_CLICK) {
					$(window).on("mousedown", function() {
						clickCount++;

						if (clickCount === 1) {
							singleClickTimer = setTimeout(function() {
								clickCount = 0;

								// single click: navigate next
								socket.emit('navigate-change', {
									key: key,
									next: true
								});
							}, 400);
						} else if (clickCount === 2) {
							clearTimeout(singleClickTimer);
							clickCount = 0;

							// double click: navigate prev
							socket.emit('navigate-change', {
								key: key,
								next: false
							});
						}
					});
				}

				$(window).on('hashchange', function() {
					if(ignore)
					return;

					socket.emit('hash-change', {
						hash: window.location.hash,
						key: key
					});
				});

				socket.on('navigate', function(data){
					if (data.click) {
						if (data.next)
						Reveal.navigateNext();
						else
						Reveal.navigatePrev();
					} else {
						window.location.hash = data.hash;
					}

					ignore = true;

					setInterval(function () {
						ignore = false;
					},100);
				});
			}
			else {
				clearTimeout(animationTimeout);

				secretTextBox.addClass('denied animation');

				animationTimeout = setTimeout(function(){
					secretTextBox.removeClass('animation');
				}, 1000);

				form.show();
			}
		});
	}

});
