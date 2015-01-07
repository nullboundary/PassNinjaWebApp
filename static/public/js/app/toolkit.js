(function (app, $, undefined) {

	'use strict';


	//////////////////////////////////////////////////////////////////////////
	//
	// Public Functions
	//
	//
	//////////////////////////////////////////////////////////////////////////

	app.toolkit = {
		/***********************************************************



		***********************************************************/
		alertDisplay: function (alertType, alertMessage) {
			//how long an alert is displayed
			var alertTimeout = 3500;
			var outHtml = '';
			var alertClass = 'alert-info';

			if (alertType == 'error') {
				alertClass = 'alert-error'; //red
				outHtml = '<i class="fa fa-frown-o"></i><strong>&nbsp; Error! &nbsp;</strong>'; //error style
			} else if (alertType == 'saved') {
				alertClass = 'alert-success'; //green
				outHtml = '<i class="fa fa-check-square-o"></i><strong>&nbsp; Saved! &nbsp;</strong>' //saved style
			}

			$('.alert')
				.attr('class', 'alert alert-dismissable ' + alertClass)
				.html(outHtml + alertMessage)
				.css('display', 'visible');

			setTimeout(function () {
				$('.alert').css('display', 'none');
			}, alertTimeout);
		},
		/***********************************************************



		***********************************************************/
		show: function () {
			for (var i = 0; i < arguments.length; i++) {
				var el = arguments[i];
				if (typeof el === "string") {
					el = d3.select(el);
				}
				el.style('display', 'inline');
			}
		},
		/***********************************************************



		***********************************************************/
		hide: function () {
			for (var i = 0; i < arguments.length; i++) {
				var el = arguments[i];
				if (typeof el === "string") {
					el = d3.select(el);
				}
				el.style('display', 'none');
			}
		},
		/***********************************************************



		***********************************************************/
		enable: function () {
			for (var i = 0; i < arguments.length; i++) {
				var el = arguments[i];
				if (typeof el === "string") {
					el = d3.select(el);
				}
				el.attr('disabled', null);
			}
		},
		/***********************************************************



		***********************************************************/
		disable: function () {
			for (var i = 0; i < arguments.length; i++) {
				var el = arguments[i];
				if (typeof el === "string") {
					el = d3.select(el);
				}
				el.attr('disabled', true);
			}
		},

		/***********************************************************

		check value input and set value property of selected input elem

		***********************************************************/
		setValue: function (selector, value) {
			if (value) {
				d3.select(selector)
					.property('value', value);
			}
		},
		/***********************************************************



		***********************************************************/
		getToken: function () {
			var token = window.sessionStorage.getItem('token');
			if (token == undefined) {
				window.location = '/';
			}
			return token;
		},

		/***********************************************************
		selects a template tag and appends it to the doc. parameter
		childNodeNum uses insertBefore to add the template before another element.

		***********************************************************/
		stampTemplate: function (templateSelector, containerSelector, childNodeNum) {
			var template = document.querySelector(templateSelector).content;
			var clone = document.importNode(template, true)
			var host = document.querySelector(containerSelector);

			if (arguments.length == 3) {
				host.insertBefore(clone, host.childNodes[childNodeNum]);
			} else {
				host.appendChild(clone);
			}
			return clone;
		},

		/***********************************************************


		***********************************************************/
		loadSVG: function (passType, callback) {
			console.log('loadSVG');

			var url = '/assets/svg/' + passType + '.svg';
			var uri = encodeURI(url);
			console.log(uri);

			//load svg xml + place into document
			d3.xml(uri, 'image/svg+xml', callback);

		},
		/***********************************************************


		***********************************************************/
		checkLoadError: function(error) {

			if (error) {
				console.warn(error);

				if (error.status === 401 || error.status === 403) {
					window.sessionStorage.removeItem('token'); //clear all sessions storages
					window.sessionStorage.removeItem('models');
					window.sessionStorage.removeItem('active');
					document.cookie = "";
					window.location = "/";

				}

				app.toolkit.alertDisplay('error', error.responseText);
				return true;
			}
			return false;
		},

		/***********************************************************

		check browser locale support
		***********************************************************/
		toLocaleStringSupportsLocales: function () {
			if (window.Intl && typeof window.Intl === 'object') {
				return true;
			} else {
				$.getScript('/assets/js/Intl.min.js')
					.done(function (script, textStatus) {
						console.log(textStatus);
					})
					.fail(function (jqxhr, settings, exception) {
						alertDisplay('error', 'problem loading Intl.min.js');
					});
				return false;
			}
		}

	};

}(passNinja = window.passNinja || {}, jQuery));
