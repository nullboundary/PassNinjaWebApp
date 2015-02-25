package main

import (
	"bitbucket.org/cicadaDev/storer"
	"bitbucket.org/cicadaDev/utils"
	"encoding/base64"
	"fmt"
	"github.com/dgrijalva/jwt-go"
	"github.com/nullboundary/govalidator"
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
		//decodePass(req)

		if err := utils.ReadJson(req, &passInput); err != nil {
			log.Printf("[ERROR] read json: %s", err.Error())
			utils.JsonErrorResponse(res, malformError, http.StatusBadRequest)
			return
		}

		if passID != "" {
			passInput.Id = passID //add the id in url to the pass - validate it below
		}

		//validate the struct before adding it to the dB
		result, err := govalidator.ValidateStruct(passInput)
		if err != nil {
			log.Printf("[ERROR] validated: %t - validation error: %s", result, err.Error())
			utils.JsonErrorResponse(res, err, http.StatusBadRequest)
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
		db, err := GetDbType(*c)
		utils.Check(err)

		passID := c.URLParams["id"]

		_, err = base64.URLEncoding.DecodeString(passID)
		if err != nil {
			log.Printf("[ERROR] Pass ID is not base64: %s", err)
			utils.JsonErrorResponse(res, notFoundError, http.StatusNotFound)
			return
		}

		//The Jwt lists the user Id. Use it as one of the seeds for the pass token id
		userID := c.Env["jwt-userid"].(string)

		passData := pass{}
		//checks to make sure the pass exists in the db, the id is real
		if ok, err := db.FindById("pass", passID, &passData); !ok {
			if err != nil {
				log.Printf("[ERROR] %s", err)
			} else {
				log.Println("[WARN] Pass ID not found in DB")
			}
			utils.JsonErrorResponse(res, notFoundError, http.StatusNotFound)
			return
		}

		//pass id is a token, verify it - checks to make sure the correct user is matching the pass id
		if verifyPassIDToken(passID, passData.Name, userID) != nil {
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

		log.Println("[DEBUG] requireLogin")

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
//	addDb Middleware
//
//
//////////////////////////////////////////////////////////////////////////
func AddDb(c *web.C, h http.Handler) http.Handler {
	handler := func(w http.ResponseWriter, r *http.Request) {

		if c.Env == nil {
			c.Env = make(map[interface{}]interface{})
		}

		if _, ok := c.Env["db"]; !ok { //test is the db is already added

			rt := storer.NewReThink()
			var err error
			rt.Url, err = utils.GetEtcdKey("db/url") //os.Getenv("PASS_APP_DB_URL")
			utils.Check(err)
			rt.Port, err = utils.GetEtcdKey("db/port") //os.Getenv("PASS_APP_DB_PORT")
			utils.Check(err)
			rt.DbName, err = utils.GetEtcdKey("db/name") //os.Getenv("PASS_APP_DB_NAME")
			utils.Check(err)

			s := storer.Storer(rt) //abstract cb to a Storer
			s.Conn()

			c.Env["db"] = s //add db
		}

		h.ServeHTTP(w, r)
	}
	return http.HandlerFunc(handler)
}

//////////////////////////////////////////////////////////////////////////
//
//	getDbType
//
//
//////////////////////////////////////////////////////////////////////////
func GetDbType(c web.C) (storer.Storer, error) {

	if v, ok := c.Env["db"]; ok {

		if db, ok := v.(storer.Storer); ok {

			return db, nil //all good

		}
		err := fmt.Errorf("value could not convert to type Storer")
		return nil, err

	}
	err := fmt.Errorf("value for key db, not found")
	return nil, err

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
