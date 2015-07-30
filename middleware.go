package main

import (
	"bitbucket.org/cicadaDev/storer"
	"bitbucket.org/cicadaDev/utils"
	"encoding/base64"
	"encoding/json"
	"fmt"
	log "github.com/Sirupsen/logrus"
	"github.com/dgrijalva/jwt-go"
	"github.com/nullboundary/govalidator"
	"github.com/zenazn/goji/web"

	"net/http"
)

//////////////////////////////////////////////////////////////////////////
//
//  passIDVerify is goji middleware that gets the pass id parameter from the query
//  and verifies it.
//
//////////////////////////////////////////////////////////////////////////
func passIDVerify(c *web.C, h http.Handler) http.Handler {
	handler := func(res http.ResponseWriter, req *http.Request) {

		notFoundError := fmt.Errorf("pass matching ID not found")
		db, err := GetDbType(*c)
		utils.Check(err)

		passID := c.URLParams["id"]
		passLog := log.WithField("passID", passID)

		_, err = base64.URLEncoding.DecodeString(passID)
		if err != nil {
			passLog.Errorf("error pass ID is not base64 %s", err)
			utils.JsonErrorResponse(res, notFoundError, http.StatusNotFound)
			return
		}

		//The Jwt lists the user Id. Use it as one of the seeds for the pass token id
		userID := c.Env["jwt-userid"].(string)

		passData := pass{}
		//checks to make sure the pass exists in the db, the id is real
		if ok, err := db.FindById("pass", passID, &passData); !ok {
			if err != nil {
				passLog.Errorf("%s", err)
			} else {
				passLog.Warnln("pass ID not found in DB")
			}
			utils.JsonErrorResponse(res, notFoundError, http.StatusNotFound)
			return
		}

		//pass id is a token, verify it - checks to make sure the correct user is matching the pass id
		if verifyPassIDToken(passID, passData.Name, userID) != nil {
			passLog.Warnln("pass ID token not valid")
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
//	passReadVerify is goji middleware thats reads json data into a pass structure
//  then validates that data.
//
//////////////////////////////////////////////////////////////////////////
func passReadVerify(c *web.C, h http.Handler) http.Handler {
	handler := func(res http.ResponseWriter, req *http.Request) {

		malformError := fmt.Errorf("The submitted pass JSON structure is malformed")
		passID := getIDType(*c) //get passID from passIDVerify middleware

		passInput := pass{}
		//decodePass(req)

		if err := utils.ReadJson(req, &passInput); err != nil {
			log.Errorf("error reading json: %s", err.Error())
			utils.JsonErrorResponse(res, malformError, http.StatusBadRequest)
			return
		}

		if passID != "" {
			passInput.Id = passID //add the id in url to the pass - validate it below
		}

		//validate the struct before adding it to the dB
		result, err := govalidator.ValidateStruct(passInput)
		if err != nil {
			log.Errorf("validated: %t - validation error: %s", result, err.Error())
			utils.JsonErrorResponse(res, err, 422) //Unprocessable Entity
			return
		}

		if passInput.Name == "" {
			log.Errorln("no name field in passInput Document")
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
//	requireLogin is a goji middlware that validates a JWT token to allow access to
//	user pages
//
//////////////////////////////////////////////////////////////////////////
func requireLogin(c *web.C, h http.Handler) http.Handler {

	fn := func(w http.ResponseWriter, r *http.Request) {

		log.Debugln("requireLogin")

		jwtoken, err := parseFromRequest(r, func(token *jwt.Token) (interface{}, error) {

			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("Unexpected signing method: %v", token.Header["alg"])
			}

			return jWTokenKey, nil
		})

		if err == nil && jwtoken.Valid {

			log.WithField("request", r.URL.String()).Debugln("jwt valid")
			c.Env["jwt-userid"] = jwtoken.Claims["sub"].(string) //add the id to the context
			h.ServeHTTP(w, r)

		} else {

			log.WithField("request", r.URL.Path[1:]).Warnln("unauthorized")
			sidcookie, err := createSessionID()
			if err != nil {
				log.Errorf("error creating sid %s", err.Error())
			}
			sidcookie.Path = "/"
			http.SetCookie(w, sidcookie)
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.WriteHeader(http.StatusUnauthorized)
			loginTemplate.Execute(w, nil)

		}

	}

	return http.HandlerFunc(fn)

}

//////////////////////////////////////////////////////////////////////////
//
//	requireAPILogin is a goji middlware that validates a JWT token to allow access to
//	user API Methods
//
//////////////////////////////////////////////////////////////////////////
func requireAPILogin(c *web.C, h http.Handler) http.Handler {

	fn := func(w http.ResponseWriter, r *http.Request) {

		log.Debugln("requireAPILogin")

		jwtoken, err := parseFromRequest(r, func(token *jwt.Token) (interface{}, error) {

			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("Unexpected signing method: %v", token.Header["alg"])
			}

			return jWTokenKey, nil
		})

		if err == nil && jwtoken.Valid {

			log.WithField("request", r.URL.String()).Debugln("jwt valid")
			c.Env["jwt-userid"] = jwtoken.Claims["sub"].(string) //add the id to the context
			h.ServeHTTP(w, r)

		} else {
			log.WithField("request", r.URL.Path[1:]).Warnln("unauthorized")
			utils.JsonErrorResponse(w, fmt.Errorf(http.StatusText(http.StatusUnauthorized)), http.StatusUnauthorized)
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

			//connect to db
			rt := storer.NewReThink()

			//load db info from json file
			dbConn, err := utils.GetCryptKey(secretKeyRing, "db/conn")
			if err != nil {
				log.Fatalf("error loading db keys from etcd %s", err)
			}
			var dbMap map[string]interface{}
			err = json.Unmarshal([]byte(dbConn), &dbMap)
			if err != nil {
				log.Fatalf("error unmarshaling db keys from etcd %s", err)
			}

			rt.Url = dbMap["url"].(string)
			rt.Port = dbMap["port"].(string)
			rt.DbName = dbMap["name"].(string)
			rt.AuthKey = dbMap["authKey"].(string)

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
