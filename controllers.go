package main

import (
	"bitbucket.org/cicadaDev/utils"
	"fmt"
	"github.com/dgrijalva/jwt-go"
	"github.com/slugmobile/goth"
	"github.com/slugmobile/goth/providers/gplus"
	"github.com/slugmobile/goth/providers/linkedin"
	"github.com/slugmobile/govalidator"
	"github.com/zenazn/goji/web"
	"log"
	"net/http"
	"path"
	"strings"
	"time"
)

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func handleTemplates(res http.ResponseWriter, req *http.Request) {

	log.Printf("handleTemplates: %s \n", req.URL.Path)

	dir, file := path.Split(req.URL.Path)
	if file == "" {
		file = "index.html"
	}
	urlPath := path.Join(dir, file) //clean and rejoin path

	err := createFromTemplate(res, "layout.tmpl", urlPath)
	if err != nil {
		log.Printf("template error %s", err)
		handleNotFound(res, req)
		return
	}

}

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func handleAccountTemplates(res http.ResponseWriter, req *http.Request) {

	log.Printf("handleAccountTemplates: %s \n", req.URL.Path)

	dir, file := path.Split(req.URL.Path)
	if file == "" {
		file = "index.html"
	}
	urlPath := path.Join(dir, file) //clean and rejoin path

	err := createFromTemplate(res, "accountLayout.tmpl", urlPath)
	if err != nil {
		log.Printf("template error %s", err)
		handleNotFound(res, req)
		return
	}

}

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func handleStatic(c web.C, res http.ResponseWriter, req *http.Request) {

	log.Printf("handleStatic %s", req.URL.Path[1:])

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
func handleLoginSuccess(c web.C, res http.ResponseWriter, req *http.Request) {

	log.Printf("handleLoginSuccess %s", req.URL.Path[1:])
	http.ServeFile(res, req, "static/public/success.html")

}

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func handleAccountPage(c web.C, res http.ResponseWriter, req *http.Request) {

	log.Printf("handlePassListPage %s", req.URL.Path[1:])
	http.ServeFile(res, req, "static/auth/accounts.html")

}

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func handleAccountStatic(c web.C, res http.ResponseWriter, req *http.Request) {

	log.Printf("handleAccountStatic %s", req.URL.Path[1:])

	dir := "static/auth"
	fs := http.FileServer(http.Dir(dir))
	cleanFiles := noDirListing(dir, fs)
	files := http.StripPrefix("/accounts/assets/", cleanFiles)

	files.ServeHTTP(res, req)

}

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func handleFeedback(c web.C, res http.ResponseWriter, req *http.Request) {

	//govalidator.IsAlphanumeric(str)

	//emailVerify := NewEmailer()
	//go emailVerify.Send(user.Email, emailtoken, url) //send concurrently

}

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func handlePassSample(c web.C, res http.ResponseWriter, req *http.Request) {
	log.Printf("handlePassSample")

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
		log.Println("Pass type not found")
		utils.JsonErrorResponse(res, fmt.Errorf("pass not found"), http.StatusBadRequest)
		return
	}

	var newPass pass

	if !db.FindById("passTemplate", templateID, &newPass) {
		log.Println("Pass type not found")
		utils.JsonErrorResponse(res, fmt.Errorf("pass not found"), http.StatusBadRequest)
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
	log.Printf("handleGetPass")

	passData := c.Env["passData"].(pass) //get pass from passIDVerify middleware

	if passData.Status != "ready" {
		log.Println("Requested Pass is not ready for distribution!")
		utils.JsonErrorResponse(res, fmt.Errorf("requested pass is not ready for sharing"), http.StatusNotFound)
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
	log.Printf("handleCustomPass")

	db, err := GetDbType(c)
	utils.Check(err)

	passData := c.Env["passData"].(pass) //get pass from passIDVerify middleware

	//pass ready to be mutated? Or of the wrong type
	if passData.Status != "api" {
		log.Println("requested Pass is not ready or configurable")
		utils.JsonErrorResponse(res, fmt.Errorf("requested pass is not ready or configurable"), http.StatusNotFound)
		return
	}

	var customVars map[string]value //a map of custom variables to change in the pass
	//read json doc of variables to change
	if err := utils.ReadJson(req, &customVars); err != nil {
		log.Printf("read json error: %s", err.Error())
		utils.JsonErrorResponse(res, fmt.Errorf("the submitted data is malformed"), http.StatusBadRequest)
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

	if !db.Add("passCustom", passData) {
		log.Println("db Add Pass Error")
		utils.JsonErrorResponse(res, fmt.Errorf("a conflict has occured creating the pass"), http.StatusInternalServerError)
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
	log.Printf("handleGetPass")

	passData := c.Env["passData"].(pass) //get pass from passIDVerify middleware

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
	log.Printf("handleGetAllPass")

	db, err := GetDbType(c)
	utils.Check(err)

	//The Jwt lists the user Id. Use it as one of the seeds for the pass token id
	userID := c.Env["jwt-userid"].(string)
	passList := []pass{}

	log.Printf("userID=%s", userID)
	filter := map[string]string{"field": "userid", "value": userID}

	if !db.FindAllEq("pass", filter, &passList) {
		log.Println("db FindAllEq Error")
		utils.JsonErrorResponse(res, fmt.Errorf("an error has occured retrieving pass data"), http.StatusInternalServerError)
		return
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
	log.Printf("handleCreatePass")

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

	if !db.Add("pass", newPass) {
		log.Println("db Add Pass Error")
		utils.JsonErrorResponse(res, fmt.Errorf("a conflict has occured creating the pass"), http.StatusInternalServerError)
		return
	}

	receipt := map[string]string{"id": newPass.Id, "time": newPass.Updated.String()}
	err = utils.WriteJson(res, receipt, true)
	utils.Check(err)

}

//////////////////////////////////////////////////////////////////////////
//
//	handleUpdatePass recieves partial pass info and merges it into the pass data
//  with a matching id.
//
//////////////////////////////////////////////////////////////////////////
func handleUpdatePass(c web.C, res http.ResponseWriter, req *http.Request) {
	log.Printf("handleUpdatePass")

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

	if !db.Merge("pass", "id", passInputFrag.Id, passInputFrag) {
		log.Println("db Merge Error")
		utils.JsonErrorResponse(res, fmt.Errorf("a conflict has occured updating the pass"), http.StatusInternalServerError)
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

	log.Println("handleLogin")

	db, err := GetDbType(c)
	utils.Check(err)

	//get matching provider from url (gplus,facebook,etc)
	provider, err := goth.GetProvider(c.URLParams["provider"])
	if err != nil {
		log.Printf("provider oauth error: %s", err.Error())
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
		log.Printf("state oauth - failed")
		utils.JsonErrorResponse(res, fmt.Errorf("ninja fail, bad request"), http.StatusBadRequest)
		return
	}

	//1. Exchange authorization code for access token
	_, err = sess.Authorize(provider, req.URL.Query())
	if err != nil {
		log.Printf("session authorize error: %s", err.Error())
		utils.JsonErrorResponse(res, fmt.Errorf("ninja fail, bad request"), http.StatusBadRequest)
		return
	}

	//2. fetch user info
	user, err := provider.FetchUser(sess)
	if err != nil {
		log.Printf("complete oauth error: %s", err.Error())
		utils.JsonErrorResponse(res, fmt.Errorf("ninja fail, server error"), http.StatusInternalServerError)
		return
	}

	var newUser userModel
	jwtoken, err := jwt.ParseFromRequest(req, func(token *jwt.Token) (interface{}, error) {
		return jWTokenKey, nil
	})
	if err == nil && jwtoken.Valid { //3a. Link user accounts - if user not already logged in

		if !db.FindById("users", jwtoken.Claims["sub"].(string), &newUser) { //if user not found
			utils.JsonErrorResponse(res, fmt.Errorf("user not found"), http.StatusBadRequest)
			return
		}

		tokenMap, err := createJWToken("token", jWTokenKey, newUser.ID)
		utils.Check(err)
		err = utils.WriteJson(res, tokenMap, true)
		utils.Check(err)

	} else { //3b. Create a new user account or return an existing one.

		ok := db.FindById("users", user.UserID, &newUser)
		if !ok { //if user not found

			//add new user
			newUser.ID = user.UserID
			newUser.Email = user.Email
			newUser.OAuthProvider = provider.Name()
			newUser.User = user //all details from oauth login
			newUser.Created = time.Now()

			if ok := db.Add("users", newUser); !ok {
				log.Println("Add User Error")
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
		log.Println("Current user not connected")
		utils.JsonErrorResponse(res, fmt.Errorf("oauth provider unlink failed"), 401)
		return
	}

	var newUser userModel
	if !db.FindById("users", jwtoken.Claims["sub"].(string), &newUser) { //if user not found
		utils.JsonErrorResponse(res, fmt.Errorf("oauth provider unlink failed"), http.StatusBadRequest)
		return
	}

	accessToken := newUser.User.AccessToken

	//Execute HTTP GET request to revoke current accessToken
	url := "https://accounts.google.com/o/oauth2/revoke?token=" + accessToken
	resp, err := http.Get(url)
	if err != nil {
		log.Println("Failed to revoke token for a given user")
		utils.JsonErrorResponse(res, fmt.Errorf("oauth provider unlink failed"), 400)
		return
	}
	defer resp.Body.Close()

	//clear user provider data, but keep the user
	newUser.OAuthProvider = ""
	newUser.User = goth.User{}

	if !db.Merge("users", "id", newUser.ID, newUser) {
		log.Println("db Merge Error")
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

	log.Printf("404 Not Found %s", req.URL.Path[1:])
	http.ServeFile(res, req, "static/public/notfound.html")

	res.WriteHeader(http.StatusNotFound) //TODO: doesnt set 404, file already served!

}
