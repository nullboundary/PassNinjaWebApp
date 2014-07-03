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
	$("#sign-up-submit").addClass("disabled");

	//signup submit
	$("form#signup-form").submit(signup);
	$("form#login-form").submit(login);

	$("#term-btn").click(printTerms);

	//load terms of service text into modal textarea
	$('#termsModal').on('show.bs.modal', loadTerms);

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

	// fire off the request to /signup
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
	request.fail(function(jqXHR, textStatus, errorThrown) {

		var error = jQuery.parseJSON(jqXHR.responseText); //parse json

		if (error.code == 409) { //conflict - user already exists
			validInputResponse(".emailBlock", "#email-mark", "error");
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
function printTerms(event) {
	console.log("printTerms");
	event.preventDefault();
	var printText = $("#terms").val();
}

/***********************************************************
 
 
 ***********************************************************/
function loadTerms(event) {
	console.log("loadTerms");

	//save pass data on server for each field update
	var jqxhr = $.get("/assets/terms.txt")
		.done(function(data) {

			$("textarea#terms").html(data);

		})
		.fail(function(jqXHR) {

			var error = jQuery.parseJSON(jqXHR.responseText); //parse json
			$("textarea#terms").html(error.error());

		})
		.always(function() {

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

	// fire off the request
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

	var email = $("#email").val();
	verifymail.verify(email, function(status, message, suggestion) {

		$("#email-check").html(message);

		if (status < 0) { //email is bad

			validInputResponse(".emailBlock", "#email-mark", "error");

		} else { //email is good

			validInputResponse(".emailBlock", "#email-mark", "success");

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
		validInputResponse(".passwordBlock", "#password-mark", "error");
		strengthPassed = false;

	} else if (result.crack_time < 86400) //less than 24hours = warning
	{

		validInputResponse(".passwordBlock", "#password-mark", "warning");
		strengthPassed = true;
	} else //good
	{

		validInputResponse(".passwordBlock", "#password-mark", "success");
		strengthPassed = true;

	}

	//validatePass();

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
			validInputResponse(".verifyBlock", "#validate-mark", "success");
		}

	} else {

		$("#pass-validate").text("Passwords Don't Match");
		validInputResponse(".verifyBlock", "#validate-mark", "error");

	}

}

/***********************************************************
 
 
 ***********************************************************/
function validInputResponse(messageBlockId, messageMarkId, status) {

	if (status == "success") {
		$("#sign-up-submit").removeClass("pure-button-disabled");
		$(messageBlockId).removeClass("has-error");
		$(messageBlockId).removeClass("has-warning");
		$(messageBlockId).addClass("has-success");
		$(messageMarkId).html('<i class="fa fa-check pass-mark has-success"></i>');
	} else if (status == "warning") {
		$("#sign-up-submit").removeClass("pure-button-disabled");
		$(messageBlockId).removeClass("has-error");
		$(messageBlockId).removeClass("has-success");
		$(messageBlockId).addClass("has-warning");
		$(messageMarkId).html('<i class="fa fa-exclamation-triangle pass-mark has-warning"></i>');
	} else {
		$("#sign-up-submit").addClass("pure-button-disabled");
		$(messageBlockId).removeClass("has-success");
		$(messageBlockId).removeClass("has-warning");
		$(messageBlockId).addClass("has-error");
		$(messageMarkId).html('<i class="fa fa-times pass-mark has-error"></i>');
	}

}