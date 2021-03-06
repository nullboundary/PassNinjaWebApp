package main

import (
	"fmt"
	log "github.com/Sirupsen/logrus"
	"net/http"
	//"path"
	"time"

	"bitbucket.org/cicadaDev/utils"
	"github.com/dgrijalva/jwt-go"
	"github.com/markbates/goth"
	"github.com/markbates/goth/providers/gplus"
	"github.com/markbates/goth/providers/linkedin"
	"github.com/zenazn/goji/web"
)

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func handleStatic(c web.C, res http.ResponseWriter, req *http.Request) {

	log.WithField("url", req.URL.Path[1:]).Debugln("handleStatic")

	dir := "/usr/share/ninja/www/static/public"
	fs := maxAgeHandler(600, http.FileServer(http.Dir(dir)))
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

	log.WithField("url", req.URL.Path[1:]).Debugln("handleIndex")

	sidcookie, err := createSessionID()
	if err != nil {
		log.Errorf("error creating sid %s", err.Error())
		utils.JsonErrorResponse(res, fmt.Errorf(http.StatusText(http.StatusInternalServerError)), http.StatusInternalServerError)
		return
	}
	http.SetCookie(res, sidcookie)
	indexTemplate.Execute(res, nil)

	//http.ServeFile(res, req, "/usr/share/ninja/www/static/public/index.html")

}

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func handleDocs(c web.C, res http.ResponseWriter, req *http.Request) {

	log.WithField("url", req.URL.Path[1:]).Debugln("handleDocs")

	docsTemplate.Execute(res, nil)

}

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func handleLoginSuccess(c web.C, res http.ResponseWriter, req *http.Request) {

	log.WithField("url", req.URL.Path[1:]).Debugln("handleLoginSuccess")

	http.ServeFile(res, req, "/usr/share/ninja/www/static/public/success.html")

}

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func handleAccountPage(c web.C, res http.ResponseWriter, req *http.Request) {

	log.WithField("url", req.URL.Path[1:]).Debugln("handleAccountPage")
	accountTemplate.Execute(res, nil)
	//http.ServeFile(res, req, "/usr/share/ninja/www/static/auth/accounts.html")

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
		log.WithField("userid", userID).Warnln("user not found")
		utils.JsonErrorResponse(res, fmt.Errorf(http.StatusText(http.StatusUnauthorized)), http.StatusUnauthorized)
		return
	}

	var fbmsg map[string]string

	if err := utils.ReadJson(req, &fbmsg); err != nil {
		log.Errorf("error read json: %s", err.Error())
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
		log.WithField("type", fbmsg["fbtype"]).Warnln("feedback type not found")
		utils.JsonErrorResponse(res, fmt.Errorf("not valid type"), http.StatusBadRequest)
		return
	}

	userRequest := fmt.Sprintf("%s - %s", req.RemoteAddr, req.UserAgent())

	go emailFeedBack.Send(msgType, msgUser.User.Name, msgUser.Email, msgUser.SubPlan, userRequest, fbmsg["msg"]) //send concurrently

	receipt := map[string]string{"status": "success", "time": time.Now().String()}
	err = utils.WriteJson(res, receipt, true)
	if err != nil {
		log.Errorf("error writing json to response %s", err)
	}

}

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func handlePassSample(c web.C, res http.ResponseWriter, req *http.Request) {

	log.WithField("url", req.URL.Path[1:]).Debugln("handlePassSample")

	var templateID string

	db, err := GetDbType(c)
	utils.Check(err)

	passType := c.URLParams["passType"]

	switch passType {
	case "boardingPass":
		templateID = "pass.ninja.pass.template.boardingPass"
	case "coupon":
		templateID = "pass.ninja.pass.template.coupon"
	case "eventTicket":
		templateID = "pass.ninja.pass.template.eventTicket"
	case "storeCard":
		templateID = "pass.ninja.pass.template.storeCard"
	case "generic":
		templateID = "pass.ninja.pass.template.generic"
	default:
		log.WithField("type", passType).Warnln("pass type not found")
		utils.JsonErrorResponse(res, fmt.Errorf("pass not found"), http.StatusNotFound)
		return
	}

	var newPass pass

	if ok, _ := db.FindById("passTemplate", templateID, &newPass); !ok {
		log.WithField("type", templateID).Warnln("pass type not found in DB")
		utils.JsonErrorResponse(res, fmt.Errorf("pass not found"), http.StatusNotFound)
		return
	}

	newPass.Id = "" // a new pass needs a new clear id
	newPass.PassType = passType
	newPass.Status = "1"             //first page complete
	newPass.KeyDoc.FormatVersion = 1 //apple says: always set to 1

	err = utils.WriteJson(res, newPass, true)
	if err != nil {
		log.Errorf("error writing json to response %s", err)
	}

}

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func handleGetPassLink(c web.C, res http.ResponseWriter, req *http.Request) {

	log.WithField("url", req.URL.Path[1:]).Debugln("handleGetPassLink")

	passData := c.Env["passData"].(pass) //get pass from passIDVerify middleware

	if passData.Status != "ready" {
		log.WithField("pass", passData.Name).Warnln("requested pass is not ready for distribution")
		utils.JsonErrorResponse(res, fmt.Errorf("requested pass is incomplete"), http.StatusForbidden)
		return
	}

	passURL := downloadServer + passData.FileName //path.Join(downloadServer, passData.FileName)
	log.WithField("url", passURL).Debugln("pass download url")

	receipt := map[string]string{"name": passData.Name, "url": passURL}
	err := utils.WriteJson(res, receipt, true)
	if err != nil {
		log.Errorf("error writing json to response %s", err)
	}

}

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func handleGetMutateList(c web.C, res http.ResponseWriter, req *http.Request) {
	log.WithField("url", req.URL.Path[1:]).Debugln("handleGetMutateList")

	passData := c.Env["passData"].(pass) //get pass from passIDVerify middleware

	if passData.Status != "api" {
		log.WithField("pass", passData.Name).Warnln("requested pass is not ready for distribution")
		utils.JsonErrorResponse(res, fmt.Errorf("requested pass is incomplete"), http.StatusForbidden)
		return
	}

	log.WithField("list", passData.MutateList).Debugln("list of mutate items")

	type receiptData struct {
		Name       string   `json:"name"`
		Mutatelist []string `json:"mutatelist"`
	}

	receipt := &receiptData{}
	receipt.Name = passData.Name
	receipt.Mutatelist = passData.MutateList

	utils.DebugPrintJson(receipt)

	//receipt := map[string]string{"name": passData.Name, "mutatelist": passData.MutateList}
	err := utils.WriteJson(res, receipt, true)
	if err != nil {
		log.Errorf("error writing json to response %s", err)
	}

}

//////////////////////////////////////////////////////////////////////////
//
//	handleMutatePass gets a json list of key/values that correspond to key/values in
//  the pass data. Allowing the user to update field data before issuing the pass.
//
//////////////////////////////////////////////////////////////////////////
func handleMutatePass(c web.C, res http.ResponseWriter, req *http.Request) {

	log.WithField("url", req.URL.Path[1:]).Debugln("handleMutatePass")

	db, err := GetDbType(c)
	utils.Check(err)

	passData := c.Env["passData"].(pass) //get pass from passIDVerify middleware

	//pass ready to be mutated? Or of the wrong type
	if passData.Status != "api" {
		log.WithField("pass", passData.Name).Warnln("requested pass is not ready or configurable")
		utils.JsonErrorResponse(res, fmt.Errorf("requested pass is incomplete or not mutatable"), http.StatusBadRequest)
		return
	}

	var customVars map[string]value //a map of custom variables to change in the pass
	//read json doc of variables to change
	if err := utils.ReadJson(req, &customVars); err != nil {
		log.Errorf("read json error %s", err)
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
		log.Errorf("adding to table:passMutate %s", err)
		utils.JsonErrorResponse(res, fmt.Errorf("a conflict has occurred creating the pass"), http.StatusConflict)
		return
	}

	passURL := downloadServer + passData.FileName //path.Join(downloadServer, passData.FileName)
	log.WithField("url", passURL).Debugln("pass download url")

	receipt := map[string]string{"name": passData.Name, "url": passURL} //should return a unique serial so it can be accessed again?
	err = utils.WriteJson(res, receipt, true)
	if err != nil {
		log.Errorf("error writing json to response %s", err)
	}

}

//////////////////////////////////////////////////////////////////////////
//
//	handleGetPass returns the pass data json document with a matching ID
//
//
//////////////////////////////////////////////////////////////////////////
func handleGetPass(c web.C, res http.ResponseWriter, req *http.Request) {

	log.WithField("url", req.URL.Path[1:]).Debugln("handleGetPass")

	//get pass from passIDVerify middleware. Will only return passes that are owned by the req user
	passData := c.Env["passData"].(pass)

	err := utils.WriteJson(res, passData, true)
	if err != nil {
		log.Errorf("error writing json to response %s", err)
	}

}

//////////////////////////////////////////////////////////////////////////
//
//	handleGetAllPass returns all pass data objects for the user.
//
//
//////////////////////////////////////////////////////////////////////////
func handleGetAllPass(c web.C, res http.ResponseWriter, req *http.Request) {

	log.WithField("url", req.URL.Path[1:]).Debugln("handleGetAllPass")

	db, err := GetDbType(c)
	utils.Check(err)

	//The Jwt lists the user Id. Use it as one of the seeds for the pass token id
	userID := c.Env["jwt-userid"].(string)
	passList := []pass{}

	log.WithField("userid", userID).Debugln("get all pass of user")
	filter := map[string]string{"field": "userid", "value": userID}

	//found false continues with empty struct. Error returns error message.
	if ok, err := db.FindAllEq("pass", filter, &passList); !ok {
		if err != nil {
			log.Errorf("db findAllEq %s", err)
			utils.JsonErrorResponse(res, fmt.Errorf("an error has occurred retrieving pass data"), http.StatusInternalServerError)
			return
		}
	}

	err = utils.WriteJson(res, passList, true)
	if err != nil {
		log.Errorf("error writing json to response %s", err)
	}

}

//////////////////////////////////////////////////////////////////////////
//
//	handleCreatePass creates a new empty pass in the db and returns its id
//
//
//////////////////////////////////////////////////////////////////////////
func handleCreatePass(c web.C, res http.ResponseWriter, req *http.Request) {
	log.WithField("url", req.URL.Path[1:]).Debugln("handleCreatePass")

	db, err := GetDbType(c)
	utils.Check(err)

	//The Jwt lists the user Id. Use it as one of the seeds for the pass token id
	userID := c.Env["jwt-userid"].(string)
	newPass := c.Env["passInput"].(pass) //get the input fragment data from passReadVerify middleware
	passUser := &userModel{}

	//pass is new, generate a token id
	newPass.Id = utils.GenerateToken(passTokenKey, newPass.Name, userID) //get id as token from base64 hmac
	newPass.Updated = time.Now()
	newPass.UserId = userID
	newPass.FileName = generateFileName(newPass.Name)

	//set pass limit remain
	if ok, _ := db.FindById("users", userID, &passUser); !ok {
		log.WithField("userid", userID).Warnf("user not found")
		utils.JsonErrorResponse(res, fmt.Errorf(http.StatusText(http.StatusUnauthorized)), http.StatusUnauthorized)
		return
	}
	newPass.PassRemain = passUser.SubPlan //count down from limit

	log.Println(userID)

	err = db.Add("pass", newPass)
	if err != nil {
		log.WithField("pass", newPass.Name).Errorf("error adding pass to db %s", err)
		utils.JsonErrorResponse(res, fmt.Errorf("a conflict has occurred creating the pass"), http.StatusConflict)
		return
	}

	receipt := map[string]string{"id": newPass.Id, "time": newPass.Updated.String()}
	err = utils.WriteJsonStatus(res, http.StatusCreated, receipt, false)
	if err != nil {
		log.Errorf("error writing json to response %s", err)
	}

}

//////////////////////////////////////////////////////////////////////////
//
//	handleDeletePass deletes a pass with the matching id from the db.
//
//////////////////////////////////////////////////////////////////////////
func handleDeletePass(c web.C, res http.ResponseWriter, req *http.Request) {

	log.WithField("url", req.URL.Path[1:]).Debugln("handleDeletePass")

	db, err := GetDbType(c)
	utils.Check(err)
	//get pass from passIDVerify middleware. Will only return passes that are owned by the req user
	passData := c.Env["passData"].(pass)

	err = db.DelById("pass", passData.Id)
	if err != nil {
		log.WithField("pass", passData.Name).Errorf("error deleting pass from db %s", err)
		utils.JsonErrorResponse(res, fmt.Errorf("Pass not found"), http.StatusNotFound)
		return
	}

	//receipt := map[string]string{"id": passData.Id, "time": time.Now().String()}
	//err = utils.WriteJson(res, receipt, true)
	//utils.Check(err)

	//successfully deleted pass, return status 204
	res.WriteHeader(http.StatusNoContent)
	return

}

//////////////////////////////////////////////////////////////////////////
//
//	handleUpdatePass recieves partial pass info and merges it into the pass data
//  with a matching id.
//
//////////////////////////////////////////////////////////////////////////
func handleUpdatePass(c web.C, res http.ResponseWriter, req *http.Request) {
	log.WithField("url", req.URL.Path[1:]).Debugln("handleUpdatePass")

	db, err := GetDbType(c)
	utils.Check(err)

	passInputFrag := c.Env["passInput"].(pass) //get the input fragment data from passReadVerify middleware

	//userID := c.Env["jwt-userid"].(string)

	//read the frag check for a mutateList, if there append it from the previous mutate list.
	if len(passInputFrag.MutateList) > 0 {
		passData := c.Env["passData"].(pass)                                                //get the whole pass data doc from passIDVerify middleware
		passInputFrag.MutateList = append(passData.MutateList, passInputFrag.MutateList...) //appending arrays on update in rethinkdb is troublesome. Append here instead.
	}

	//TODO: set status to "ready" here rather than in frontend. Also finalize all required data
	//if passInputFrag.Status == "ready" || passInputFrag.Status == "api" {

	//generateFileName makes a unique Id for the pass file name
	//passInputFrag.FileName = generateFileName(passInputFrag.Name) //!!FIXME: only generate 1 time if pass changes. use a hash to see change.

	//}

	if ok, err := db.Merge("pass", passInputFrag.Id, true, passInputFrag); !ok {
		if err != nil {
			log.WithField("pass", passInputFrag.Name).Errorf("error merging pass in db %s", err)
			utils.JsonErrorResponse(res, fmt.Errorf("a conflict has occurred updating the pass"), http.StatusConflict)
			return
		}
		//unchanged
		log.WithField("pass", passInputFrag.Name).Debugln("pass unchanged")
		res.WriteHeader(http.StatusNotModified)
		return
	}

	//TODO: this sucks, is there another way? Not to update twice?
	//if modified, update the modified time
	//var modPassTime pass
	//modPassTime.Id = passInputFrag.Id
	//modPassTime.Name = passInputFrag.Name
	//modPassTime.Updated = time.Now()
	//_, err = db.Merge("pass", "id", modPassTime.Id, modPassTime)
	//if err != nil {
	//	log.Printf("[ERROR] %s - merging pass: %s to db", err, passInputFrag.Name)
	//	utils.JsonErrorResponse(res, fmt.Errorf("a conflict has occurred updating the pass"), http.StatusConflict)
	//	return
	//}

	receipt := map[string]string{"id": passInputFrag.Id, "time": time.Now().Format(time.RFC3339)} //update the timestamp
	err = utils.WriteJson(res, receipt, true)
	if err != nil {
		log.Errorf("error writing json to response %s", err)
	}

}

//////////////////////////////////////////////////////////////////////////
//
//	handleLogin uses oauth to link a provider account by register or login.
//	The function returns a JWT.
//
//////////////////////////////////////////////////////////////////////////
func handleLogin(c web.C, res http.ResponseWriter, req *http.Request) {

	log.WithField("url", req.URL.Path[1:]).Debugln("handleLogin")

	db, err := GetDbType(c)
	utils.Check(err)

	//get matching provider from url (gplus,facebook,etc)
	provider, err := goth.GetProvider(c.URLParams["provider"])
	if err != nil {
		log.Errorf("provider oauth error %s", err)
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
		log.WithField("referer", req.Referer()).Warnln("verifying oauth state - failed")
		utils.JsonErrorResponse(res, fmt.Errorf("ninja fail, bad request"), http.StatusBadRequest)
		return
	}

	//1. Exchange authorization code for access token
	_, err = sess.Authorize(provider, req.URL.Query())
	if err != nil {
		log.WithField("provider", provider.Name()).Errorf("session authorize error %s", err)
		utils.JsonErrorResponse(res, fmt.Errorf("ninja fail, bad request"), http.StatusBadRequest)
		return
	}

	//2. fetch user info
	user, err := provider.FetchUser(sess)
	if err != nil {
		log.WithField("provider", provider.Name()).Errorf("fetch user info oauth error %s", err)
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
				log.WithField("userid", jwtoken.Claims["sub"].(string)).Errorf("error finding user in db %s", err)
			} else {
				log.WithField("userid", jwtoken.Claims["sub"].(string)).Warnln("user not found in db")
			}
			utils.JsonErrorResponse(res, fmt.Errorf("user not found"), http.StatusBadRequest)
			return
		}

		tokenMap, err := createJWToken("token", jWTokenKey, newUser.ID)
		if err != nil {
			log.WithField("userid", newUser.ID).Errorf("error creating jwt %s", err)
		}
		err = utils.WriteJson(res, tokenMap, true)
		if err != nil {
			log.Errorf("error writing json to response %s", err)
		}

	} else { //3b. Create a new user account or return an existing one.

		if ok, err := db.FindById("users", user.UserID, &newUser); !ok { //if user not found

			if err != nil {
				log.WithField("userid", user.UserID).Errorf("error finding user in db %s", err)
				utils.JsonErrorResponse(res, fmt.Errorf("Internal error"), http.StatusInternalServerError)
				return
			}

			//add new user
			newUser.ID = user.UserID
			newUser.Email = user.Email
			newUser.OAuthProvider = provider.Name()
			newUser.User = user //all details from oauth login
			newUser.Subscriber = false
			newUser.SubPlan = FreePlan
			newUser.Created = time.Now()
			newUser.LastLogin = time.Now()

			err := db.Add("users", newUser)
			if err != nil {
				log.WithField("userid", newUser.ID).Errorf("error adding user to db %s", err)
				utils.JsonErrorResponse(res, fmt.Errorf("this user account already exists"), http.StatusConflict)
				return
			}

		}
		//http.Redirect(res, req, "/accounts/", http.StatusFound)
		tokenMap, err := createJWToken("token", jWTokenKey, newUser.ID)
		if err != nil {
			log.WithField("userid", newUser.ID).Errorf("error creating jwt %s", err)
		}
		err = utils.WriteJson(res, tokenMap, true)
		if err != nil {
			log.Errorf("error writing json to response %s", err)
		}

	}

}

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func handleUnlink(c web.C, res http.ResponseWriter, req *http.Request) {

	log.WithField("url", req.URL.Path[1:]).Debugln("handleUnlink")

	db, err := GetDbType(c)
	utils.Check(err)

	jwtoken, err := jwt.ParseFromRequest(req, func(token *jwt.Token) (interface{}, error) {
		return jWTokenKey, nil
	})
	if err != nil || !jwtoken.Valid {
		log.WithField("userid", jwtoken.Claims["sub"].(string)).Warnln("user account not linked")
		utils.JsonErrorResponse(res, fmt.Errorf("oauth provider unlink failed"), 401)
		return
	}

	var newUser userModel
	if ok, err := db.FindById("users", jwtoken.Claims["sub"].(string), &newUser); !ok { //if user not found
		if err != nil {
			log.WithField("userid", jwtoken.Claims["sub"].(string)).Errorf("error finding user in db %s", err)
		} else {
			log.WithField("userid", jwtoken.Claims["sub"].(string)).Warnln("user not found in db - cannot unlink")
		}
		utils.JsonErrorResponse(res, fmt.Errorf("oauth provider unlink failed"), http.StatusBadRequest)
		return
	}

	accessToken := newUser.User.AccessToken

	//Execute HTTP GET request to revoke current accessToken
	url := "https://accounts.google.com/o/oauth2/revoke?token=" + accessToken
	resp, err := http.Get(url)
	if err != nil {
		log.WithField("userid", newUser.ID).Errorf("error failed to revoke access token %s", err)
		utils.JsonErrorResponse(res, fmt.Errorf("oauth provider unlink failed"), 400)
		return
	}
	defer resp.Body.Close()

	//clear user provider data, but keep the user
	newUser.OAuthProvider = ""
	newUser.User = goth.User{}

	_, err = db.Merge("users", newUser.ID, false, newUser)
	if err != nil {
		log.WithField("userid", newUser.ID).Errorf("db Merge Error %s", err)
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

	log.WithField("url", req.URL.Path[1:]).Warnln("page not found")

	res.Header().Set("Content-Type", "text/html; charset=utf-8")
	res.WriteHeader(http.StatusNotFound)
	notFoundTemplate.Execute(res, nil)

}
