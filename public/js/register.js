var strengthPassed = false;
var verifymail;


/***********************************************************
 
 
 ***********************************************************/
$(function() {

	var request;

	console.log("start!!");

	verifymail = new Comfirm.AlphaMail.Verimail();

	$("#email").bind('focus change keyup blur', verifyEmail);
	$("#password").bind('focus change keyup blur', checkPass);
	$("#confirmPassword").bind('focus change keyup blur', validatePass);

	//disable the signup button. Leave enabled in html for non js browsers
	$("#submit").addClass("disabled");

	//signup submit
	$("form#signup-form").submit(signup);
	$("form#login-form").submit(login);

});

/***********************************************************
 
 
 ***********************************************************/
function signup(event, request) {

	console.log("signup");

	// abort any pending request
	if (request) {
		request.abort();
	}

	// prevent default posting of form
	event.preventDefault();

	// setup some local variables
	var $form = $(this);
	// let's select and cache all the fields
	var $inputs = $form.find("input, select, button, textarea");
	// serialize the data in the form
	var serializedData = $form.serialize();

	// let's disable the inputs for the duration of the ajax request
	// Disabled form elements will not be serialized.
	$inputs.prop("disabled", true);

	// fire off the request to /form.php
	request = $.ajax({
		url: "/signup",
		type: "POST",
		data: serializedData
	});

	// callback handler that will be called on success
	request.done(function(response, textStatus, jqXHR) {

		window.location.replace(jqXHR.getResponseHeader('Location'));
	});


	// callback handler that will be called on failure
	request.fail(function(jqXHr, textStatus, errorThrown) {

		var error = jQuery.parseJSON(jqXHr.responseText); //parse json

		if (error.code == 409) { //conflict - user already exists
			$(".emailBlock").removeClass("has-success");
			$(".emailBlock").removeClass("has-warning");
			$(".emailBlock").addClass("has-error"); //add error red box
			$("#email-mark").html('<span class="glyphicon glyphicon-remove email-mark"></span>'); //add x
			$("#submit").addClass("disabled"); //disable signup button, until user changes email
			$("#email-check").html(error.error); //fill in response
		} else { //other error ?
			$("#submit").addClass("disabled"); //disable signup button, until user changes email
			$("#email-check").html(error.error); //fill in response
		}
	});


	// callback handler that will be called regardless
	// if the request failed or succeeded
	request.always(function() {
		// reenable the inputs
		$inputs.prop("disabled", false);
	});
}

/***********************************************************
 
 
 ***********************************************************/
function login(event, request) {

	console.log("login");

	// abort any pending request
	if (request) {
		request.abort();
	}

	// prevent default posting of form
	event.preventDefault();

	// setup some local variables
	var $form = $(this);
	// let's select and cache all the fields
	var $inputs = $form.find("input, select, button, textarea");
	// serialize the data in the form
	var serializedData = $form.serialize();

	// let's disable the inputs for the duration of the ajax request
	// Disabled form elements will not be serialized.
	$inputs.prop("disabled", true);

	// fire off the request to /form.php
	request = $.ajax({
		url: "/login",
		type: "POST",
		data: serializedData
	});

	// callback handler that will be called on success
	request.done(function(response, textStatus, jqXHR) {

		window.location.replace(jqXHR.getResponseHeader('Location'));
	});


	// callback handler that will be called on failure
	request.fail(function(jqXHr, textStatus, errorThrown) {

		$("#response-group").addClass("has-error"); //add error red box
		var error = jQuery.parseJSON(jqXHr.responseText); //parse json
		$("#response-error").html(error.error); //fill in response
	});


	// callback handler that will be called regardless
	// if the request failed or succeeded
	request.always(function() {
		// reenable the inputs
		$inputs.prop("disabled", false);
	});



}

/***********************************************************
 
 
 ***********************************************************/
function verifyEmail() {
	console.log("email!!")

	var email = $("#email").val();
	verifymail.verify(email, function(status, message, suggestion) {

		$("#email-check").html(message);
		//$("#email-check").html('<div id="check-message"></div>');
		//$("#check-message").html(message);

		if (status < 0) { //email is bad
			$("#submit").addClass("disabled"); //disable button
			$("#email-mark").html('<i class="fa fa-times email-mark has-error"></i>'); //add x
			$(".emailBlock").removeClass("has-success");
			$(".emailBlock").removeClass("has-warning");
			$(".emailBlock").addClass("has-error"); //add error red box
		} else { //email is good
			$(".emailBlock").removeClass("has-error");
			$(".emailBlock").removeClass("has-warning");
			$(".emailBlock").addClass("has-success");
			$("#email-mark").html('<i class="fa fa-check email-mark has-success"></i>');

			var password = $("#password").val(); //useful when editing email after error, or after password entered
			if (password.length > 0) {
				checkPass();
			}
		}

	});



}


/***********************************************************
 
 
 ***********************************************************/
function checkPass() {

	var password = $("#password").val();
	result = zxcvbn(password);
	$("#pass-check").text("The time required for bad guys to crack this password: " + result.crack_time_display);

	if (result.crack_time < 60) //error to short
	{
		$("#submit").addClass("disabled");
		$(".passwordBlock").removeClass("has-success");
		$(".passwordBlock").removeClass("has-warning");
		$(".passwordBlock").addClass("has-error");
		$("#password-mark").html('<i class="fa fa-times pass-mark has-error"></i>');
		strengthPassed = false;

	} else if (result.crack_time < 86400) //less than 24hours = warning
	{
		$("#submit").addClass("disabled");
		$(".passwordBlock").removeClass("has-error");
		$(".passwordBlock").removeClass("has-success");
		$(".passwordBlock").addClass("has-warning");
		$("#password-mark").html('<i class="fa fa-exclamation-triangle pass-mark has-warning"></i>');
		strengthPassed = true;
	} else //good
	{
		$("#submit").addClass("disabled");
		$(".passwordBlock").removeClass("has-error");
		$(".passwordBlock").removeClass("has-warning");
		$(".passwordBlock").addClass("has-success");
		$("#password-mark").html('<i class="fa fa-check pass-mark has-success"></i>');
		strengthPassed = true;

	}

	validatePass();

}

/***********************************************************
 
 
 ***********************************************************/
function validatePass() {

	var password1 = $("#password").val();
	var password2 = $("#confirmPassword").val();

	if (password1 == password2) {

		$("#pass-validate").text("Passwords Match");

		if (strengthPassed == true) //only allow registeration if password strength passes
		{
			$("#submit").removeClass("disabled");
			$(".verifyBlock").removeClass("has-error");
			$(".verifyBlock").removeClass("has-warning");
			$(".verifyBlock").addClass("has-success");

		}
		$("#validate-mark").html('<span class="glyphicon glyphicon-ok verify-mark"></span>');

	} else {

		$("#pass-validate").text("Passwords Don't Match");

		$("#submit").addClass("disabled");

		$(".verifyBlock").removeClass("has-success");
		$(".verifyBlock").removeClass("has-warning");
		$(".verifyBlock").addClass("has-error");

		$("#validate-mark").html('<span class="glyphicon glyphicon-remove verify-mark"></span>');

	}

}