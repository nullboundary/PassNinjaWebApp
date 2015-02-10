package main

import (
	"bitbucket.org/cicadaDev/utils"
	"bytes"
	"encoding/base64"
	"fmt"
	"github.com/dgrijalva/jwt-go"
	"github.com/lidashuang/goji_gzip"
	//"github.com/markbates/goth"
	//"github.com/markbates/goth/providers/gplus"
	//"github.com/markbates/goth/providers/linkedin"
	"github.com/pressly/cji"
	"github.com/slugmobile/goth"
	"github.com/slugmobile/goth/providers/gplus"
	"github.com/slugmobile/goth/providers/linkedin"
	"github.com/slugmobile/govalidator"
	//"github.com/zenazn/goji"
	"crypto/tls"
	"crypto/x509"
	"github.com/zenazn/goji/graceful"
	"github.com/zenazn/goji/web"
	"github.com/zenazn/goji/web/middleware"
	"html/template"
	"image/png"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"path"
	"strings"
	"time"
)

var (
	passTokenKey   = []byte(`@1nw_5_sg@WRQtjRYry{IJ1O[]t,#)w`) //TODO: lets make a new key and put this somewhere safer!
	csrfKey        = []byte(`@1nw_5_sg@WRQtjRYry{IJ1O[]t,#)w`) //TODO: lets make a new key and put this somewhere safer!
	jWTokenKey     = []byte(`yY8\,VQ\'MZM(n:0;]-XzUMcYU9rQz,`) //TODO: lets make a new key and put this somewhere safer!
	downloadServer = "http://local.pass.ninja:8001/pass/1/passes/"
)

func init() {

	goth.UseProviders(
		gplus.New("969868015384-o3odmnhi4f6r4tq2jismc3d3nro2mgvb.apps.googleusercontent.com", "jtPCSimeA1krMOfl6E0fMtDb", "https://local.pass.ninja/auth/success"),
		linkedin.New("75mfhvxm75cuur", "nXPmZkFmu5zVvaeh", "https://local.pass.ninja/auth/success"),
	)

	//add custom validator functions
	addValidators()

}

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func main() {

	root := web.New()
	root.Use(middleware.Logger)
	root.Use(middleware.Recoverer)
	root.Use(gzip.GzipHandler) //gzip everything

	//Login
	root.Post("/auth/:provider", handleLogin)
	root.Get("/auth/:provider/unlink/", handleUnlink)
	root.Get("/auth/success", handleLoginSuccess) //loads a login success page into oauth popup.(probably never seen)

	//home page
	root.Get("/index.html", handleTemplates)
	root.Get("/", handleTemplates)
	root.Get("/assets/*", handleStatic)

	//web app login pages
	accounts := web.New()
	root.Handle("/accounts/*", accounts)                //handle all things that require login
	accounts.Use(requireLogin)                          //login check middleware
	accounts.Get("/accounts/home", handleAccountPage)   //seperate assets for accounts - TODO add back to non accounts
	accounts.Get("/accounts/editor", handleAccountPage) //seperate assets for accounts - TODO add back to non accounts

	accounts.Post("/accounts/feedback", handleFeedback)
	accounts.Get("/accounts/template/:passType", handlePassSample) //return a sample json object of the pass type

	//accounts.Get("/accounts/passes/", handleAccountStatic)

	//login root, view current passes - TODO: now its set as builder! - TODO: Make static
	//accounts.Get("/accounts/index.html", handlePageStatic) //handleAccountTemplates)
	//accounts.Get("/accounts/", handlePageStatic)           //handleAccountTemplates)
	//accounts.Get("/accounts/builder.html", handleAccountTemplates) //make a pass

	//API
	api := web.New()
	root.Handle("/api/*", api)                                                                  //handle all things that require login
	api.Use(requireLogin)                                                                       //login check middleware
	api.Get("/api/v1/passes/", handleGetAllPass)                                                //get a list of all the users passes
	api.Get("/api/v1/passes/:id", cji.Use(passIDVerify).On(handleGetPass))                      //get a specific pass data object
	api.Get("/api/v1/passes/:id/link", cji.Use(passIDVerify).On(handleGetPassLink))             //get a public link to a pass - or update pass variables.
	api.Post("/api/v1/passes/", cji.Use(passReadVerify).On(handleCreatePass))                   //creates a new pass
	api.Patch("/api/v1/passes/:id/link", cji.Use(passIDVerify).On(handleMutatePass))            //update pass variables.
	api.Patch("/api/v1/passes/:id", cji.Use(passIDVerify, passReadVerify).On(handleUpdatePass)) //partial update of pass data

	root.NotFound(handleNotFound)

	root.Use(AddDb) //comment out to remove db function for testing

	//customCA Server is only used for testing
	customCAServer := &graceful.Server{Addr: ":10443", Handler: root}
	customCAServer.TLSConfig = addRootCA()
	customCAServer.ListenAndServeTLS("tls/mycert1.cer", "tls/mycert1.key")

	//goji.Serve() //set port via cl - example: app -bind :9000
	//graceful.ListenAndServeTLS(":10443", "tls/mycert1.cer", "tls/mycert1.key", root)
}

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func addRootCA() *tls.Config {

	//cAPair, err := tls.LoadX509KeyPair("tls/myCA.cer", "tls/myCA.key")
	//utils.Check(err)
	severCert, err := ioutil.ReadFile("tls/myCA.cer")
	utils.Check(err)

	//log.Println(cAPair.Leaf.Raw)
	//log.Println(cAPair.Leaf.IsCA)
	cAPool := x509.NewCertPool()
	cAPool.AppendCertsFromPEM(severCert)
	//cAPool.AddCert(cAPair.Leaf)

	tlc := &tls.Config{
		RootCAs:    cAPool,
		MinVersion: tls.VersionTLS10,
	}

	return tlc

}

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func addValidators() {

	//check barcode format is 1 of 3 types
	barcodeFormats := []string{"PKBarcodeFormatQR", "PKBarcodeFormatPDF417", "PKBarcodeFormatAztec"}
	addListValidator("barcode", barcodeFormats)

	//check transit type
	transitTypes := []string{"PKTransitTypeAir", "PKTransitTypeBoat", "PKTransitTypeBus", "PKTransitTypeGeneric", "PKTransitTypeTrain"}
	addListValidator("transit", transitTypes)

	//check datestyle type (timestyle and date style are the same list)
	timeTypes := []string{"PKDateStyleNone", "PKDateStyleShort", "PKDateStyleMedium", "PKDateStyleLong", "PKDateStyleFull"}
	addListValidator("datestyle", timeTypes)

	//check numstyle type
	numTypes := []string{"PKNumberStyleDecimal", "PKNumberStylePercent", "PKNumberStyleScientific", "PKNumberStyleSpellOut"}
	addListValidator("numstyle", numTypes)

	//check text align style types
	textAlignTypes := []string{"PKTextAlignmentLeft", "PKTextAlignmentCenter", "PKTextAlignmentRight", "PKTextAlignmentNatural"}
	addListValidator("align", textAlignTypes)

	//check barcode format is 1 of 3 types
	passTypes := []string{"boardingPass", "coupon", "eventTicket", "generic", "storeCard"}
	addListValidator("passtypes", passTypes)

	//check to make sure its a valid currency code: USD,GBP etc
	govalidator.TagMap["iso4217"] = govalidator.Validator(func(str string) bool {

		if len(str) != 3 {
			return false
		}
		if !govalidator.IsUpperCase(str) {
			return false
		}
		return govalidator.IsAlpha(str)

	})

	//check to make sure its a valid png image datauri
	govalidator.TagMap["imagepng"] = govalidator.Validator(func(str string) bool {

		dataStr := strings.SplitN(str, ",", 2) //seperate data:image/png;base64, from the DataURI

		if !strings.Contains(dataStr[0], "image") {
			return false
		}

		if !strings.Contains(dataStr[0], "png") {
			return false
		}

		if !govalidator.IsDataURI(str) {
			return false
		}

		//decode the data and see if its truely a png, by getting the color space and width/height
		data, err := base64.StdEncoding.DecodeString(dataStr[1]) // [] byte
		utils.Check(err)
		r := bytes.NewReader(data)
		_, err = png.DecodeConfig(r)
		if err != nil {
			log.Printf("png decodeConfig error:%s", err.Error())
			return false
		}

		return true

	})

}

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func addListValidator(key string, typeList []string) {

	govalidator.TagMap[key] = govalidator.Validator(func(str string) bool {
		for _, nextType := range typeList {
			if str == nextType {
				return true
			}
		}
		return false
	})

}

// Try to find the token in an http.Request.
// This method will call ParseMultipartForm if there's no token in the header.
// Currently, it looks in the Authorization header as well as
// looking for an 'access_token' request parameter in req.Form.
func parseFromRequest(req *http.Request, keyFunc jwt.Keyfunc) (token *jwt.Token, err error) {

	// Look for an Authorization header
	if ah := req.Header.Get("Authorization"); ah != "" {
		// Should be a bearer token
		if len(ah) > 6 && strings.ToUpper(ah[0:6]) == "BEARER" {
			return jwt.Parse(ah[7:], keyFunc)
		}
	}

	//Check for a token in the cookie
	c, err := req.Cookie("token")
	if err == nil {
		return jwt.Parse(c.Value, keyFunc)
	}

	// Look for "token=" url parameter
	param := req.URL.Query()
	if tokStr := param.Get("token"); tokStr != "" {
		return jwt.Parse(tokStr, keyFunc)
	}

	// Look for "access_token" parameter
	req.ParseMultipartForm(10e6)
	if tokStr := req.Form.Get("access_token"); tokStr != "" {
		return jwt.Parse(tokStr, keyFunc)
	}

	return nil, jwt.ErrNoTokenInRequest

}

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func verifyState(req *http.Request) bool {

	stateKeyFunc := func(token *jwt.Token) (interface{}, error) {
		return csrfKey, nil
	}

	param := req.URL.Query()
	stateStr := param.Get("state")
	log.Println(stateStr)

	if stateStr == "" {
		return false
	}
	state, err := jwt.Parse(stateStr, stateKeyFunc)
	if err != nil || !state.Valid {
		return false
	}

	sidCookie, err := req.Cookie("sid")
	log.Println(sidCookie.Value)
	if err != nil || sidCookie.Value == "" {
		return false
	}
	sid, err := jwt.Parse(sidCookie.Value, stateKeyFunc)
	if err != nil || !sid.Valid {
		return false
	}

	if sidCookie.Value != stateStr {
		return false
	}

	return true

}

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func updatePassVariables(newPass *pass, customVars map[string]value) error {

	var passDoc *passStructure

	log.Println(newPass.PassType)

	//get the correct keydoc passtructure
	switch newPass.PassType {
	case "boardingPass":
		passDoc = newPass.KeyDoc.BoardingPass
	case "coupon":
		passDoc = newPass.KeyDoc.Coupon
	case "eventTicket":
		passDoc = newPass.KeyDoc.EventTicket
	case "generic":
		passDoc = newPass.KeyDoc.Generic
	case "storeCard":
		passDoc = newPass.KeyDoc.StoreCard
	default:
		log.Printf("Pass type %s not found", newPass.PassType)
		return fmt.Errorf("the submitted data is malformed")
	}

	//loop over every mutate variable key in pass
mutateLoop:
	for _, key := range newPass.MutateList {
		val, ok := customVars[key]
		if !ok {
			log.Printf("mutate key not found:%s", key)
			return fmt.Errorf("the submitted data is malformed")
		}

		fmt.Printf("%s -> %s\n", key, val)
		//sKey := []rune(key)           //aux4: starts as
		//fieldType := sKey[:len(sKey)] //aux: first part
		//index := sKey[len(sKey):]     //4: second part

		//match against each field slice : TODO, is this ideal?
		for i, field := range passDoc.AuxiliaryFields {
			if field.Key == key {
				passDoc.AuxiliaryFields[i].Value = &val //TODO: can't always be strings!
				continue mutateLoop
			}
		}

		for i, field := range passDoc.SecondaryFields {
			if field.Key == key {
				passDoc.SecondaryFields[i].Value = &val
				continue mutateLoop
			}
		}

		for i, field := range passDoc.BackFields {
			if field.Key == key {
				passDoc.BackFields[i].Value = &val
				continue mutateLoop
			}
		}

		for i, field := range passDoc.HeaderFields {
			if field.Key == key {
				passDoc.HeaderFields[i].Value = &val
				continue mutateLoop
			}
		}

		for i, field := range passDoc.PrimaryFields {
			if field.Key == key {
				passDoc.PrimaryFields[i].Value = &val
				continue mutateLoop
			}
		}

	}

	return nil
}

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func verifyToken(token string, seeds ...string) error {

	//id is a token, verify it
	ok, err := utils.VerifyToken(passTokenKey, token, seeds...)
	if err != nil {
		log.Printf("verify token failed: %s", err.Error()) //base64 decode failed
		return fmt.Errorf("pass not found")
	}
	if !ok {
		log.Println("token Failed to verify!")
		return fmt.Errorf("pass not found")
	}

	return nil
}

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func createJWToken(tokenName string, signKey []byte, subClaim string) (map[string]string, error) {

	token := jwt.New(jwt.GetSigningMethod("HS256"))
	log.Println(subClaim)
	// Set some claims
	token.Claims["sub"] = subClaim
	token.Claims["iat"] = time.Now().Unix()
	token.Claims["exp"] = time.Now().Add(time.Hour * 72).Unix()

	// Sign and get the complete encoded token as a string
	tokenString, err := token.SignedString(signKey)
	if err != nil {
		return nil, err
	}

	return map[string]string{tokenName: tokenString}, nil
}

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func noDirListing(prefix string, h http.Handler) http.Handler {

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		safePath := govalidator.SafeFileName(r.URL.Path)

		log.Println(path.Join(prefix, safePath))
		fileInfo, err := os.Stat(path.Join(prefix, r.URL.Path))
		if err != nil {
			log.Println(err)
			handleNotFound(w, r)
			return
		}
		if fileInfo.IsDir() {
			handleNotFound(w, r)
			return
		}

		h.ServeHTTP(w, r)
	})
}

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func createFromTemplate(res http.ResponseWriter, layout string, file string) error {

	//make sure the file name is safe
	safeFile := govalidator.SafeFileName(file)

	fp := path.Join("templates", safeFile)
	lp := path.Join("templates", layout)

	// Return a 404 if the template doesn't exist
	info, err := os.Stat(fp)
	if err != nil {
		if os.IsNotExist(err) {
			return fmt.Errorf("404 File doesn't exist: %s", err)
		}
	}

	// Return a 404 if the request is for a directory
	if info.IsDir() {
		return fmt.Errorf("404 File doesn't exist: %s", err)
	}

	templates, err := template.ParseFiles(lp, fp)
	utils.Check(err)

	sidValue, err := createJWToken("sid", csrfKey, utils.RandomStr(16))
	if err != nil {
		return fmt.Errorf("Internal Error")
	}
	log.Println(sidValue["sid"])

	//sidValue := utils.GenerateToken(csrfKey, time.Now().String(), string(randBytes)) //get id as token from base64 hmac
	sidcookie := &http.Cookie{Name: "sid", Value: sidValue["sid"]}
	http.SetCookie(res, sidcookie)

	templates.ExecuteTemplate(res, "layout", nil)

	return nil
}
