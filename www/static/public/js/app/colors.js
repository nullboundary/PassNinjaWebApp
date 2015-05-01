(function (tk, pb, $, undefined) {

	'use strict';

	/***********************************************************


 	***********************************************************/
	function init() {

		//setup all color sliders
		configColorSlider('.rgb-label', '.label-text');
		configColorSlider('.rgb-value', '.value-text');
		configColorSlider('.rgb-background', '.pass-bg');
	}

	/***********************************************************


 	***********************************************************/
	function configColorSlider(sliderClass, changeClass) {

		var colorValue = $(changeClass).css('fill');

		$(sliderClass).ColorPickerSliders({
			flat: true,
			swatches: false,
			color: colorValue,
			order: {
				rgb: 1,
				preview: 2
			},
			onchange: function (container, color) {

				if (changeClass == '.pass-bg') { //adjust values gradiant in pass background

					var centerColor = color.tiny.toRgbString();
					//IOS7 & 8 have no more gradiant bg
					pb.svg().select('.pass-bg-lite').style('stop-color', centerColor);
					pb.svg().select('.pass-bg').style('stop-color', centerColor);
					pb.svg().select('.pass-bg-dark').style('stop-color', centerColor);

					//TODO: This seems to give incorrect values. Find new method.
				/*	var centerColor = color.tiny.toRgbString();
					var topColor = color.tiny.brighten(15).toRgbString();
					var bottomColor = color.tiny.darken(30).toRgbString(); //lightens or darkens color obj, so darken needs to add back after lighten.
					console.log(color.tiny.toRgbString());
					pb.svg().select('.pass-bg-lite').style('stop-color', topColor);
					pb.svg().select(changeClass).style('stop-color', centerColor);
					pb.svg().select('.pass-bg-dark').style('stop-color', bottomColor); */

				} else { //adjust values of all the other classes
					pb.svg().selectAll(changeClass).style('fill', color.tiny.toRgbString());
				}

			},
			labels: {
				rgbred: 'Red',
				rgbgreen: 'Green',
				rgbblue: 'Blue'
			}
		});
	}

	/***********************************************************

 	set color sliders to match keydoc
 	***********************************************************/
	function updateSliders() {


		$('.rgb-label').trigger('colorpickersliders.updateColor', pb.template().keyDoc.labelColor);
		$('.rgb-value').trigger('colorpickersliders.updateColor', pb.template().keyDoc.foregroundColor);
		$('.rgb-background').trigger('colorpickersliders.updateColor', pb.template().keyDoc.backgroundColor);

	}

	/***********************************************************


 	***********************************************************/
	function updateRectStroke(selection) {

		//set rect stroke color
		var bgColor = tinycolor(pb.template().keyDoc.backgroundColor);

		if (bgColor.isDark()) {
			pb.svg().selectAll(selection).style('stroke', '#fff');
		} else {
			pb.svg().selectAll(selection).style('stroke', '#000');

		}

		//d3.selectAll(selection).style('stroke', bgColor.complement().greyscale().toHexString());

	}

	function resetRectStroke() {

		//reset text rect stroke color
		pb.svg().selectAll('rect.text-btn-rect').style('stroke', null);
		//reset image rect stroke color
		pb.svg().selectAll('rect.img-btn-rect').style('stroke', null);
	}


	/***********************************************************


 	***********************************************************/
	function onColorSave() {

		console.log('colorSave');

		var bgColor = pb.svg().selectAll('.pass-bg').style('stop-color');
		var labelColor = pb.svg().selectAll('.label-text').style('fill');
		var valueColor = pb.svg().selectAll('.value-text').style('fill');

		//set colors in keyDoc
		pb.template().keyDoc.foregroundColor = valueColor;
		pb.template().keyDoc.labelColor = labelColor;
		pb.template().keyDoc.backgroundColor = bgColor;


		var passData = {
			'name': pb.template().name,
			'status': pb.status(pb.colors.index()),
			'keyDoc': {
				'labelColor': labelColor,
				'foregroundColor': valueColor,
				'backgroundColor': bgColor
			}
		};

		pb.update(pb.template().id, passData);

	}

	//////////////////////////////////////////////////////////////////////////
	//
	// Public Functions
	//
	//
	//////////////////////////////////////////////////////////////////////////

	pb.colors = {

		/* setup and configure color sliders */
		init: function () {
			init();
		},

		/* update sliders match pass colors */
		updateSliders: function () {
			updateSliders();
		},

		updateRectStroke: function (selection) {
			updateRectStroke(selection);
		},

		resetRectStroke: function () {
			resetRectStroke();
		},

		/* save color data to server */
		save: function () {
			onColorSave();
		},
		name: function () {
			return 'colors';
		},

		index: function () {
			return 5;
		}

	};



	//return passColors; //return the colors object

}(passNinja.toolkit, passEditor = passNinja.passEditor || {}, jQuery));
