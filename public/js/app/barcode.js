(function(passBarcode, $, undefined) {

	/***********************************************************
 
 
 	***********************************************************/
	function init() {

		d3.select('select#barcode-format')
			.on('input', onBarcodeSelect);
	}
	/***********************************************************
 
 
 	***********************************************************/
	function setBarcode() {

		if (passTemplate.keyDoc.barcode != null) {

			switch (passTemplate.keyDoc.barcode.format) {
				case "PKBarcodeFormatPDF417":
					setPDF417();
					break;
				case "PKBarcodeFormatAztec":
					setAztec();
					break;
				case "PKBarcodeFormatQR":
					setQR();
					break;
				default:
					break;
			}

		} else {
			setNone();
		}
	}

	/***********************************************************
 
 
 	***********************************************************/
	function onBarcodeSubmit() {

		console.log("onBarcode");
		d3.event.preventDefault();

		//get input box values
		var barData = $("#popData").val();
		var barEncode = $("#popEncode").val();
		var barAlt = $("#popAlt").val();

		passTemplate.keyDoc.barcode.message = barData;
		passTemplate.keyDoc.barcode.messageEncoding = barEncode;
		passTemplate.keyDoc.barcode.altText = barAlt;


	}

	/***********************************************************
 
 
 	***********************************************************/
	function setPDF417() {

		//set rectangle
		d3.select("g#barcode-group rect")
			.attr('x', 35)
			.attr('y', 304)
			.attr('width', 247)
			.attr('height', 70)

		//set image
		d3.select("g#barcode-group image")
			.attr('width', 222)
			.attr('height', 91)
			.attr('x', 46.5)
			.attr('y', 293)
			.attr('xlink:href', '/assets/svg/img/pdf417.png');

		//display
		d3.select("g#barcode-group").style("display", "inline");
	}

	/***********************************************************
 
 
 	***********************************************************/
	function setAztec() {

		//set rectangle
		d3.select("g#barcode-group rect")
			.attr('x', 81)
			.attr('y', 240)
			.attr('width', 153)
			.attr('height', 153)

		//set image
		d3.select("g#barcode-group image")
			.attr('x', 91)
			.attr('y', 250)
			.attr('width', 133)
			.attr('height', 133)
			.attr('xlink:href', '/assets/svg/img/aztec.png');

		//display
		d3.select("g#barcode-group").style("display", "inline");

	}

	/***********************************************************
 
 
 	***********************************************************/
	function setQR() {

		//select all aux text groups and subtract Y pos
		var aux = d3.selectAll('.auxiliaryFields');
		aux.each(function() {
			shiftField(this, -6);
		});

		//select all secondary text groups and subtract Y pos
		var second = d3.selectAll('.secondaryFields');
		second.each(function() {
			shiftField(this, -16);
		});

		//set rectangle
		d3.select("g#barcode-group rect")
			.attr('x', 81)
			.attr('y', 240)
			.attr('width', 153)
			.attr('height', 153)

		d3.select("g#barcode-group image")
			.attr('x', 91)
			.attr('y', 250)
			.attr('width', 133)
			.attr('height', 133)
			.attr('xlink:href', '/assets/svg/img/QR.png');

		d3.select("g#barcode-group").style("display", "inline");

	}

	/***********************************************************
 
 
 	***********************************************************/
	function setNone() {
		d3.select("g#barcode-group").style("display", "none");

	}

	/***********************************************************
 
 
 	***********************************************************/
	function shiftField(selection, amount) {
		var textGroup = d3.select(selection.parentNode);
		var translate = d3.transform(textGroup.attr("transform")).translate;
		var xPos = translate[0];
		var yPos = translate[1] + amount;
		textGroup.attr("transform", "translate(" + xPos + "," + yPos + ")");
	}

	/***********************************************************
 
 
 	***********************************************************/
	function onBarcodeSelect() {

		switch (this.value) {
			case "PDF417":
				setPDF417();
				break;
			case "Aztec":
				setAztec();
				break;
			case "QR":
				setQR();
				break;
			case "No Barcode":
				setNone();
			default:
				break;
		}

	}

	//////////////////////////////////////////////////////////////////////////
	//
	// Public Functions
	//
	//
	//////////////////////////////////////////////////////////////////////////

	/* setup and configure barcode handlers */
	passBarcode.init = function() {
		init();
	};

	passBarcode.set = function() {
		setBarcode();
	}

	passBarcode.save = function() {
		onBarcodeSubmit();
	};

}(passBarcode = window.passBarcode || {}, jQuery));