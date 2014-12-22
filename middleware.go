package main

import (
	"bitbucket.org/cicadaDev/utils"
	"encoding/base64"
	"fmt"
	"github.com/dgrijalva/jwt-go"
	"github.com/slugmobile/govalidator"
	"github.com/zenazn/goji/web"
	"log"
	"net/http"
)

//////////////////////////////////////////////////////////////////////////
//
//	passReadVerify is goji middleware thats reads json data into a pass structure
//  then validates that data.
//
//////////////////////////////////////////////////////////////////////////
func passReadVerify(c *web.C, h http.Handler) http.Handler {
	handler := func(res http.ResponseWriter, req *http.Request) {

		malformError := fmt.Errorf("the submitted pass data is malformed")
		passID := getIDType(*c) //get passID from passIDVerify middleware

		passInput := pass{}
		if err := utils.ReadJson(req, &passInput); err != nil {
			log.Printf("read json error: %s", err.Error())
			utils.JsonErrorResponse(res, malformError, http.StatusBadRequest)
			return
		}

		if passID != "" {
			passInput.Id = passID //add the id in url to the pass - validate it below
		}

		//validate the struct before adding it to the dB
		result, err := govalidator.ValidateStruct(passInput)
		if err != nil {
			log.Printf("validated: %t - validation error: %s", result, err.Error())
			utils.JsonErrorResponse(res, malformError, http.StatusBadRequest)
			return
		}

		c.Env["passInput"] = passInput //add pass to context

		h.ServeHTTP(res, req)
	}
	return http.HandlerFunc(handler)
}

//////////////////////////////////////////////////////////////////////////
//
//  passIDVerify is goji middleware that gets the pass id parameter from the query
//  and verifies it.
//
//////////////////////////////////////////////////////////////////////////
func passIDVerify(c *web.C, h http.Handler) http.Handler {
	handler := func(res http.ResponseWriter, req *http.Request) {

		notFoundError := fmt.Errorf("pass not found")
		db, err := utils.GetDbType(*c)
		utils.Check(err)

		passID := c.URLParams["id"]

		_, err = base64.URLEncoding.DecodeString(passID)
		if err != nil {
			log.Println("Pass ID is not base64")
			utils.JsonErrorResponse(res, notFoundError, http.StatusNotFound)
			return
		}

		//The Jwt lists the user Id. Use it as one of the seeds for the pass token id
		userID := c.Env["jwt-userid"].(string)

		passData := pass{}
		//checks to make sure the pass exists in the db, the id is real
		if !db.FindById("pass", passID, &passData) {
			log.Println("Pass ID not found in DB")
			utils.JsonErrorResponse(res, notFoundError, http.StatusNotFound)
			return
		}

		//id is a token, verify it - checks to make sure the correct user is matching the pass id
		if verifyToken(passID, passData.Name, userID) != nil {
			utils.JsonErrorResponse(res, notFoundError, http.StatusNotFound)
			return
		}

		c.Env["passID"] = passID //add passID to context
		c.Env["passData"] = passData

		h.ServeHTTP(res, req)
	}
	return http.HandlerFunc(handler)
}

//////////////////////////////////////////////////////////////////////////
//
//	requireLogin is a goji middlware that validates a JWT token to allow access to
//	user functions/pages
//
//////////////////////////////////////////////////////////////////////////
func requireLogin(c *web.C, h http.Handler) http.Handler {

	fn := func(w http.ResponseWriter, r *http.Request) {

		log.Println("requireLogin ")

		param := r.URL.Query()
		log.Println(param.Get("token"))

		jwtoken, err := parseFromRequest(r, func(token *jwt.Token) (interface{}, error) {
			return jWTokenKey, nil
		})

		if err == nil && jwtoken.Valid {

			log.Println(r.URL.String())
			c.Env["jwt-userid"] = jwtoken.Claims["sub"].(string) //add the id to the context
			h.ServeHTTP(w, r)

		} else {
			w.WriteHeader(http.StatusUnauthorized) //user is not authorized
		}

	}

	return http.HandlerFunc(fn)

}

//////////////////////////////////////////////////////////////////////////
//
//	getIDType safely retrieves passID from the web.C context. If passID doesn't
//  exist it returns an empty string ""
//
//////////////////////////////////////////////////////////////////////////
func getIDType(c web.C) string {
	if v, ok := c.Env["passID"]; ok {
		if passID, ok := v.(string); ok {
			return passID
		}
	}
	return ""
}