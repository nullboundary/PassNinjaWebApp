(function(passBarcode, $, undefined) {

	/***********************************************************
 
 
 	***********************************************************/
	function init() {
		d3.select('select#barcode-format')
			.on('input', onBarcodeSelect);
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
	function onBarcodeSelect() {

		switch (this.value) {
			case "PDF417":

				d3.select("g#barcode-group image")
					.attr('width', 322)
					.attr('height', 91)
					.attr('xlink:href', '/assets/svg/img/pdf417.png');

				d3.select("g#barcode-group").style("display", "inline");

				break;
			case "Aztec":

				d3.select("g#barcode-group image")
					.attr('width', 133)
					.attr('height', 133)
					.attr('xlink:href', '/assets/svg/img/aztec.png');

				d3.select("g#barcode-group").style("display", "inline");

				break;
			case "QR":

				d3.select("g#barcode-group image")
					.attr('width', 133)
					.attr('height', 133)
					.attr('xlink:href', '/assets/svg/img/QR.png');

				d3.select("g#barcode-group").style("display", "inline");

				break;
			case "No Barcode":

				d3.select("g#barcode-group").style("display", "none");

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

	passBarcode.save = function() {
		onBarcodeSubmit();
	};

}(passBarcode = window.passBarcode || {}, jQuery));