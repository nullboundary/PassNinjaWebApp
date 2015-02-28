package main

import (
	"bitbucket.org/cicadaDev/utils"
	"fmt"
	"github.com/dgrijalva/jwt-go"
	"github.com/markbates/goth"
	"github.com/markbates/goth/providers/gplus"
	"github.com/markbates/goth/providers/linkedin"
	"github.com/nullboundary/govalidator"
	"github.com/zenazn/goji/web"
	"log"
	"net/http"
	"strings"
	"time"
)

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func handleStatic(c web.C, res http.ResponseWriter, req *http.Request) {

	log.Printf("[DEBUG] handleStatic %s", req.URL.Path[1:])

	dir := "static/public"
	fs := http.FileServer(http.Dir(dir))
	cleanFiles := noDirListing(dir, fs)
	files := http.StripPrefix("/assets/", cleanFiles)

	files.ServeHTTP(res, req)

}

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func handleIndex(c web.C, res http.ResponseWriter, req *http.Request) {

	log.Printf("[DEBUG] handleIndex %s", req.URL.Path[1:])

	sidValue, err := createJWToken("sid", csrfKey, utils.RandomStr(16))
	if err != nil {
		log.Printf("[ERROR] createJWTToken failed: %s", err.Error())
		utils.JsonErrorResponse(res, fmt.Errorf("bad request"), http.StatusBadRequest)
		return
	}
	log.Println(sidValue["sid"])
	sidcookie := &http.Cookie{Name: "sid", Value: sidValue["sid"]}
	http.SetCookie(res, sidcookie)

	http.ServeFile(res, req, "static/public/index.html")

}

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func handleLoginSuccess(c web.C, res http.ResponseWriter, req *http.Request) {

	log.Printf("[DEBUG] handleLoginSuccess %s", req.URL.Path[1:])
	http.ServeFile(res, req, "static/public/success.html")

}

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func handleAccountPage(c web.C, res http.ResponseWriter, req *http.Request) {

	log.Printf("[DEBUG] handlePassListPage %s", req.URL.Path[1:])
	http.ServeFile(res, req, "static/auth/accounts.html")

}

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func handleFeedback(c web.C, res http.ResponseWriter, req *http.Request) {

	db, err := GetDbType(c)
	utils.Check(err)
	userID := c.Env["jwt-userid"].(string)
	msgUser := &userModel{}

	//if user not found (shouldn't happen unless token validtion fail!)
	if ok, _ := db.FindById("users", userID, &msgUser); !ok {
		log.Println("[ERROR] user not found %s", userID)
		utils.JsonErrorResponse(res, fmt.Errorf(http.StatusText(http.StatusUnauthorized)), http.StatusUnauthorized)
		return
	}

	var fbmsg map[string]string

	if err := utils.ReadJson(req, &fbmsg); err != nil {
		log.Printf("[ERROR] read json: %s", err.Error())
		utils.JsonErrorResponse(res, fmt.Errorf("message json malformed"), http.StatusBadRequest)
		return
	}

	//TODO: whitelist validator!
	/*if !govalidator.IsUTFLetterNumeric(fbmsg["msg"]) {
		log.Printf("[ERROR] feedback message not valid")
		utils.JsonErrorResponse(res, fmt.Errorf("message not valid"), http.StatusBadRequest)
		return
	}*/

	//hardcoded to make sure nothing else slips through
	var msgType string
	switch fbmsg["fbtype"] {
	case "Suggestion":
		msgType = "Suggestion"
	case "Report a bug":
		msgType = "Report a bug"
	case "Complaint":
		msgType = "Complaint"
	case "Question":
		msgType = "Question"
	default:
		log.Printf("[WARN] Feedback Type: %s not found", fbmsg["fbtype"])
		utils.JsonErrorResponse(res, fmt.Errorf("not valid type"), http.StatusBadRequest)
		return
	}

	userRequest := fmt.Sprintf("%s - %s", req.RemoteAddr, req.UserAgent())

	go emailFeedBack.Send(msgType, msgUser.User.Name, msgUser.Email, msgUser.SubPlan, userRequest, fbmsg["msg"]) //send concurrently

	receipt := map[string]string{"status": "success", "time": time.Now().String()}
	err = utils.WriteJson(res, receipt, true)
	utils.Check(err)

}

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func handlePassSample(c web.C, res http.ResponseWriter, req *http.Request) {
	log.Printf("[DEBUG] handlePassSample")

	var templateID string

	db, err := GetDbType(c)
	utils.Check(err)

	passType := c.URLParams["passType"]

	switch passType {
	case "boardingPass":
		templateID = "pass.ninja.pass.template.boardingpass" //TODO spelling mistake in DB
	case "coupon":
		templateID = "pass.ninja.pass.template.coupon"
	case "eventTicket":
		templateID = "pass.ninja.pass.template.eventTicket"
	case "storeCard":
		templateID = "pass.ninja.pass.template.storeCard"
	case "generic":
		templateID = "pass.ninja.pass.template.generic"
	default:
		log.Printf("[WARN] Pass type: %s not found", passType)
		utils.JsonErrorResponse(res, fmt.Errorf("pass not found"), http.StatusNotFound)
		return
	}

	var newPass pass

	if ok, _ := db.FindById("passTemplate", templateID, &newPass); !ok {
		log.Printf("[WARN] Pass type: %s not found in DB", templateID)
		utils.JsonErrorResponse(res, fmt.Errorf("pass not found"), http.StatusNotFound)
		return
	}

	newPass.Id = "" // a new pass needs a new clear id
	newPass.PassType = passType
	newPass.Status = "1"             //first page complete
	newPass.KeyDoc.FormatVersion = 1 //apple says: always set to 1

	err = utils.WriteJson(res, newPass, true)
	utils.Check(err)

}

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func handleGetPassLink(c web.C, res http.ResponseWriter, req *http.Request) {
	log.Printf("[DEBUG] handleGetPass")

	passData := c.Env["passData"].(pass) //get pass from passIDVerify middleware

	if passData.Status != "ready" {
		log.Println("[WARN] Requested Pass: %s is not ready for distribution!", passData.Name)
		utils.JsonErrorResponse(res, fmt.Errorf("requested pass is incomplete"), http.StatusForbidden)
		return
	}

	passURL := downloadServer + passData.FileName
	log.Println(passURL)

	receipt := map[string]string{"name": passData.Name, "url": passURL}
	err := utils.WriteJson(res, receipt, true)
	utils.Check(err)

}

//////////////////////////////////////////////////////////////////////////
//
//	handleMutatePass gets a json list of key/values that correspond to key/values in
//  the pass data. Allowing the user to update field data before issuing the pass.
//
//////////////////////////////////////////////////////////////////////////
func handleMutatePass(c web.C, res http.ResponseWriter, req *http.Request) {
	log.Printf("[DEBUG] handleCustomPass")

	db, err := GetDbType(c)
	utils.Check(err)

	passData := c.Env["passData"].(pass) //get pass from passIDVerify middleware

	//pass ready to be mutated? Or of the wrong type
	if passData.Status != "api" {
		log.Println("[WARN] requested Pass: %s is not ready or configurable", passData.Name)
		utils.JsonErrorResponse(res, fmt.Errorf("requested pass is incomplete or not mutatable"), http.StatusForbidden)
		return
	}

	var customVars map[string]value //a map of custom variables to change in the pass
	//read json doc of variables to change
	if err := utils.ReadJson(req, &customVars); err != nil {
		log.Printf("[ERROR] read json error: %s", err.Error())
		utils.JsonErrorResponse(res, fmt.Errorf("The submitted pass JSON structure is malformed"), http.StatusBadRequest)
		return
	}

	//swap in variable values from req into variable placeholders in pass
	if updatePassVariables(&passData, customVars) != nil {
		utils.JsonErrorResponse(res, err, http.StatusBadRequest)
		return
	}

	newPassNum := utils.GenerateFnvHashID(passData.Name, time.Now().String())
	newPassID := fmt.Sprintf("%x", newPassNum)
	passData.Id = newPassID
	passData.FileName = passData.FileName + "-" + newPassID

	err = db.Add("passMutate", passData)
	if err != nil { //passMutate table holds mutated ready passes for download.
		log.Printf("[ERROR] add to table:passMutate %s", err)
		utils.JsonErrorResponse(res, fmt.Errorf("a conflict has occurred creating the pass"), http.StatusConflict)
		return
	}

	passURL := downloadServer + passData.FileName
	log.Println(passURL)

	receipt := map[string]string{"name": passData.Name, "url": passURL}
	err = utils.WriteJson(res, receipt, true)
	utils.Check(err)

}

//////////////////////////////////////////////////////////////////////////
//
//	handleGetPass returns the pass data json document with a matching ID
//
//
//////////////////////////////////////////////////////////////////////////
func handleGetPass(c web.C, res http.ResponseWriter, req *http.Request) {
	log.Printf("[DEBUG] handleGetPass")

	//get pass from passIDVerify middleware. Will only return passes that are owned by the req user
	passData := c.Env["passData"].(pass)

	err := utils.WriteJson(res, passData, true)
	utils.Check(err)

}

//////////////////////////////////////////////////////////////////////////
//
//	handleGetAllPass returns all pass data objects for the user.
//
//
//////////////////////////////////////////////////////////////////////////
func handleGetAllPass(c web.C, res http.ResponseWriter, req *http.Request) {
	log.Printf("[DEBUG] handleGetAllPass")

	db, err := GetDbType(c)
	utils.Check(err)

	//The Jwt lists the user Id. Use it as one of the seeds for the pass token id
	userID := c.Env["jwt-userid"].(string)
	passList := []pass{}

	log.Printf("userID=%s", userID)
	filter := map[string]string{"field": "userid", "value": userID}

	//found false continues with empty struct. Error returns error message.
	if ok, err := db.FindAllEq("pass", filter, &passList); !ok {
		if err != nil {
			log.Printf("[ERROR] db findAllEq %s", err)
			utils.JsonErrorResponse(res, fmt.Errorf("an error has occurred retrieving pass data"), http.StatusInternalServerError)
			return
		}
	}

	err = utils.WriteJson(res, passList, true)
	utils.Check(err)

}

//////////////////////////////////////////////////////////////////////////
//
//	handleCreatePass creates a new empty pass in the db and returns its id
//
//
//////////////////////////////////////////////////////////////////////////
func handleCreatePass(c web.C, res http.ResponseWriter, req *http.Request) {
	log.Printf("[DEBUG] handleCreatePass")

	db, err := GetDbType(c)
	utils.Check(err)

	//The Jwt lists the user Id. Use it as one of the seeds for the pass token id
	userID := c.Env["jwt-userid"].(string)
	newPass := c.Env["passInput"].(pass) //get the input fragment data from passReadVerify middleware

	//pass is new, generate a token id
	newPass.Id = utils.GenerateToken(passTokenKey, newPass.Name, userID) //get id as token from base64 hmac
	newPass.Updated = time.Now()
	newPass.UserId = userID
	log.Println(userID)

	err = db.Add("pass", newPass)
	if err != nil {
		log.Printf("[ERROR]%s adding pass: %s to db", err, newPass.Name)
		utils.JsonErrorResponse(res, fmt.Errorf("a conflict has occurred creating the pass"), http.StatusConflict)
		return
	}

	receipt := map[string]string{"id": newPass.Id, "time": newPass.Updated.String()}
	err = utils.WriteJson(res, receipt, true) //TODO: change to 201 created?
	utils.Check(err)

}

//////////////////////////////////////////////////////////////////////////
//
//	handleUpdatePass recieves partial pass info and merges it into the pass data
//  with a matching id.
//
//////////////////////////////////////////////////////////////////////////
func handleUpdatePass(c web.C, res http.ResponseWriter, req *http.Request) {
	log.Printf("[DEBUG] handleUpdatePass")

	db, err := GetDbType(c)
	utils.Check(err)

	passInputFrag := c.Env["passInput"].(pass) //get the input fragment data from passReadVerify middleware

	//read the frag check for a mutateList, if there append it from the previous mutate list.
	if len(passInputFrag.MutateList) > 0 {
		passData := c.Env["passData"].(pass)                                                //get the whole pass data doc from passIDVerify middleware
		passInputFrag.MutateList = append(passData.MutateList, passInputFrag.MutateList...) //appending arrays on update in rethinkdb is troublesome. Append here instead.
	}

	passInputFrag.Updated = time.Now() //update the timestamp

	//TODO: set status to "ready" here rather than in frontend. Also finalize all required data
	if passInputFrag.Status == "ready" || passInputFrag.Status == "api" {
		//Unique PassTypeId for the db and the pass file name
		idHash := utils.GenerateFnvHashID(passInputFrag.Name, time.Now().String()) //generate a hash using pass orgname + color + time
		passName := strings.Replace(passInputFrag.Name, " ", "-", -1)              //remove spaces from organization name
		fileName := fmt.Sprintf("%s-%d", passName, idHash)
		passInputFrag.FileName = govalidator.SafeFileName(fileName)
		log.Println(passInputFrag.FileName)

	}

	_, err = db.Merge("pass", "id", passInputFrag.Id, passInputFrag)
	if err != nil {
		log.Printf("[ERROR] %s - merging pass: %s to db", err, passInputFrag.Name)
		utils.JsonErrorResponse(res, fmt.Errorf("a conflict has occurred updating the pass"), http.StatusConflict)
		return
	}

	receipt := map[string]string{"id": passInputFrag.Id, "time": passInputFrag.Updated.String()}
	err = utils.WriteJson(res, receipt, true)
	utils.Check(err)

}

//////////////////////////////////////////////////////////////////////////
//
//	handleLogin uses oauth to link a provider account by register or login.
//	The function returns a JWT.
//
//////////////////////////////////////////////////////////////////////////
func handleLogin(c web.C, res http.ResponseWriter, req *http.Request) {

	log.Println("[DEBUG] handleLogin")

	db, err := GetDbType(c)
	utils.Check(err)

	//get matching provider from url (gplus,facebook,etc)
	provider, err := goth.GetProvider(c.URLParams["provider"])
	if err != nil {
		log.Printf("[ERROR] provider oauth error: %s", err.Error())
		utils.JsonErrorResponse(res, fmt.Errorf("ninja fail, bad request"), http.StatusBadRequest)
		return
	}

	var sess goth.Session
	if provider.Name() == "gplus" {
		sess = &gplus.Session{}
	} else if provider.Name() == "linkedin" {
		sess = &linkedin.Session{}
	}

	//verify oauth state is same as session id. protect against cross-site request forgery
	if ok := verifyState(req); !ok {
		log.Printf("[WARN] verifying oauth state - failed")
		utils.JsonErrorResponse(res, fmt.Errorf("ninja fail, bad request"), http.StatusBadRequest)
		return
	}

	//1. Exchange authorization code for access token
	_, err = sess.Authorize(provider, req.URL.Query())
	if err != nil {
		log.Printf("[ERROR] session authorize error: %s", err.Error())
		utils.JsonErrorResponse(res, fmt.Errorf("ninja fail, bad request"), http.StatusBadRequest)
		return
	}

	//2. fetch user info
	user, err := provider.FetchUser(sess)
	if err != nil {
		log.Printf("[ERROR] fetch user info oauth error: %s", err.Error())
		utils.JsonErrorResponse(res, fmt.Errorf("ninja fail, server error"), http.StatusInternalServerError)
		return
	}

	var newUser userModel
	jwtoken, err := jwt.ParseFromRequest(req, func(token *jwt.Token) (interface{}, error) {
		return jWTokenKey, nil
	})
	if err == nil && jwtoken.Valid { //3a. Link user accounts - if user not already logged in

		if ok, err := db.FindById("users", jwtoken.Claims["sub"].(string), &newUser); !ok { //if user not found
			if err != nil {
				log.Printf("[ERROR] %s", err)
			} else {
				log.Printf("[WARN] user: %s not found in db", jwtoken.Claims["sub"].(string))
			}
			utils.JsonErrorResponse(res, fmt.Errorf("user not found"), http.StatusBadRequest)
			return
		}

		tokenMap, err := createJWToken("token", jWTokenKey, newUser.ID)
		utils.Check(err)
		err = utils.WriteJson(res, tokenMap, true)
		utils.Check(err)

	} else { //3b. Create a new user account or return an existing one.

		if ok, err := db.FindById("users", user.UserID, &newUser); !ok { //if user not found

			if err != nil {
				log.Println("[ERROR] %s", err)
				utils.JsonErrorResponse(res, fmt.Errorf("Internal error"), http.StatusInternalServerError)
				return
			}

			//add new user
			newUser.ID = user.UserID
			newUser.Email = user.Email
			newUser.OAuthProvider = provider.Name()
			newUser.User = user //all details from oauth login
			newUser.Created = time.Now()

			err := db.Add("users", newUser)
			if err != nil {
				log.Println("[ERROR] %s - problem adding user %s to db", err, newUser.ID)
				utils.JsonErrorResponse(res, fmt.Errorf("this user account already exists"), http.StatusConflict)
				return
			}

		}
		//http.Redirect(res, req, "/accounts/", http.StatusFound)
		tokenMap, err := createJWToken("token", jWTokenKey, newUser.ID)
		utils.Check(err)
		err = utils.WriteJson(res, tokenMap, true)
		utils.Check(err)

	}

}

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func handleUnlink(c web.C, res http.ResponseWriter, req *http.Request) {

	db, err := GetDbType(c)
	utils.Check(err)

	jwtoken, err := jwt.ParseFromRequest(req, func(token *jwt.Token) (interface{}, error) {
		return jWTokenKey, nil
	})
	if err != nil || !jwtoken.Valid {
		log.Printf("[WARN] Current user %s not connected", jwtoken.Claims["sub"].(string))
		utils.JsonErrorResponse(res, fmt.Errorf("oauth provider unlink failed"), 401)
		return
	}

	var newUser userModel
	if ok, err := db.FindById("users", jwtoken.Claims["sub"].(string), &newUser); !ok { //if user not found
		if err != nil {
			log.Printf("[ERROR] %s", err)
		} else {
			log.Printf("[WARN] Current user %s not found in db - cannot unlink", jwtoken.Claims["sub"].(string))
		}
		utils.JsonErrorResponse(res, fmt.Errorf("oauth provider unlink failed"), http.StatusBadRequest)
		return
	}

	accessToken := newUser.User.AccessToken

	//Execute HTTP GET request to revoke current accessToken
	url := "https://accounts.google.com/o/oauth2/revoke?token=" + accessToken
	resp, err := http.Get(url)
	if err != nil {
		log.Printf("[ERROR] failed to revoke token for a user: %s", newUser.ID)
		utils.JsonErrorResponse(res, fmt.Errorf("oauth provider unlink failed"), 400)
		return
	}
	defer resp.Body.Close()

	//clear user provider data, but keep the user
	newUser.OAuthProvider = ""
	newUser.User = goth.User{}

	_, err = db.Merge("users", "id", newUser.ID, newUser)
	if err != nil {
		log.Println("[ERROR] db Merge Error")
		utils.JsonErrorResponse(res, fmt.Errorf("oauth provider unlink failed"), http.StatusInternalServerError)
		return
	}

	res.WriteHeader(http.StatusNoContent) //successfully unlinked from oauth
	return

}

//////////////////////////////////////////////////////////////////////////
//
// handleNotFound is a 404 handler.
//
//
//////////////////////////////////////////////////////////////////////////
func handleNotFound(res http.ResponseWriter, req *http.Request) {

	log.Printf("[WARN] 404 Not Found %s", req.URL.Path[1:])
	http.ServeFile(res, req, "static/public/notfound.html")

	res.WriteHeader(http.StatusNotFound) //TODO: doesnt set 404, file already served!

}
