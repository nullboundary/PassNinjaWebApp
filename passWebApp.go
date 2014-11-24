package main

import (
	"bitbucket.org/cicadaDev/utils"
	"fmt"
	"github.com/gorilla/context"
	"github.com/gorilla/securecookie"
	"github.com/gorilla/sessions"
	"github.com/lidashuang/goji_gzip"
	"github.com/markbates/goth"
	"github.com/markbates/goth/providers/gplus"
	"github.com/slugmobile/govalidator"
	"github.com/zenazn/goji"
	"github.com/zenazn/goji/web"
	"html/template"
	"log"
	"net/http"
	"net/url"
	"os"
	"path"
	"time"
)

//userModel can be any struct that represents a user in a system
type userModel struct {
	Id            string    `form:"id" gorethink:"id"`
	Email         string    `form:"email" gorethink:"email"`                         //Email is ID of user
	User          goth.User `form:"user" gorethink:"user"`                           //Detailed User info from oauth login
	Organization  string    `form:"organization" gorethink:"organization,omitempty"` //User organization name
	OAuthProvider string    `form:"_" gorethink:"oauth"`                             //User is using OAuth login, not email
	Created       time.Time `form:"_" gorethink:"created,omitempty"`                 //Account Created time/date
	LastLogin     time.Time `form:"-" gorethink:"lastLogin,omitempty"`               //Last login time
	Subscriber    bool      `form:"_" gorethink:"subscriber,omitempty"`              //subscriber: true or false? (false could be free trial users)
	SubStart      time.Time `form:"_" gorethink:"subStart,omitempty"`                //Subscription start date
	SubExpiration time.Time `form:"_" gorethink:"subExpire,omitempty"`               //Subscription expiration date
	SubPlan       string    `form:"_" gorethink:"subPlan,omitempty"`                 //Subscription plan for this user
	PassList      []string  `form:"_" gorethink:"passList,omitempty"`                //A list of the pass Ids this users has made
}

var (
	sessionStore    *sessions.CookieStore
	sessionAuthKey  []byte = make([]byte, 64)
	sessionCryptKey []byte = make([]byte, 32)
	emailTokenKey   []byte = make([]byte, 32)
)

// SessionName is the key used to access the session store.
const oauthSessionName = "_ninja_auth"
const loginSessionName = "_ninja_ssid"

//var emailTokenKey = "something-secret" //key for email verification hmac
var idTokenKey = []byte(`@1nw_5_sg@WRQtjRYry{IJ1O[]t,#)w`) //TODO: lets make a new key and put this somewhere safer!

func init() {
	sessionAuthKey = securecookie.GenerateRandomKey(64)
	sessionCryptKey = securecookie.GenerateRandomKey(32)
	emailTokenKey = securecookie.GenerateRandomKey(32) //key for email verification hmac

	sessionStore = sessions.NewCookieStore(sessionAuthKey, sessionCryptKey)

	goth.UseProviders(
		gplus.New("969868015384-o3odmnhi4f6r4tq2jismc3d3nro2mgvb.apps.googleusercontent.com", "jtPCSimeA1krMOfl6E0fMtDb", "http://local.pass.ninja:8000/auth/gplus/callback"),
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

	goji.Use(gzip.GzipHandler) //gzip everything

	goji.Get("/auth/:provider", handleAuthorize)
	goji.Get("/auth/:provider/callback", handleCallBack)

	//home page
	goji.Get("/index.html", handleTemplates)
	goji.Get("/", handleTemplates)
	goji.Get("/assets/*", handleStatic)

	//login pages
	accounts := web.New()
	goji.Handle("/accounts/*", accounts) //handle all things that require login
	accounts.Use(requireLogin)           //login check middleware

	accounts.Get("/accounts/assets/*", handleAccountStatic) //seperate assets for accounts

	//login root, view current passes - TODO: now its set as builder!
	accounts.Get("/accounts/index.html", handleAccountTemplates)
	accounts.Get("/accounts/", handleAccountTemplates)

	accounts.Get("/accounts/template/:passType", handleAccountPassStructure) //return a json object of the pass type
	accounts.Get("/accounts/builder.html", handleAccountTemplates)           //make a pass
	accounts.Post("/accounts/save", handleAccountSave)                       //save pass data

	goji.NotFound(handleNotFound)

	goji.Use(utils.AddDb) //comment out to remove db function for testing

	goji.Serve() //set port via cl - example: app -bind :9000

	//goji.ListenAndServeTLS(":10443", "cert.pem", "key.pem", nil)

}

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
func handleAccountPassStructure(c web.C, res http.ResponseWriter, req *http.Request) {
	log.Printf("handleAccountPassStructure")

	var templateID string

	db, err := utils.GetDbType(c)
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
		utils.JsonErrorResponse(res, fmt.Errorf("Pass not found"), http.StatusBadRequest)
		return
	}

	newPass := pass{}

	if !db.FindByID("passTemplate", templateID, &newPass) {
		log.Println("Pass type not found")
		utils.JsonErrorResponse(res, fmt.Errorf("Pass not found"), http.StatusBadRequest)
		return
	}

	newPass.Id = "" // a new pass needs a new clear id

	err = utils.WriteJson(res, newPass, true)
	utils.Check(err)

}

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func handleAccountSave(c web.C, res http.ResponseWriter, req *http.Request) {
	log.Printf("handleAccountSave")

	db, err := utils.GetDbType(c)
	utils.Check(err)

	newPass := pass{}
	if err := utils.ReadJson(req, &newPass); err != nil {
		log.Printf("read json error: %s", err.Error())
		utils.JsonErrorResponse(res, fmt.Errorf("The submitted pass data is malformed."), http.StatusBadRequest)
		return
	}

	//validate the struct before adding it to the dB
	result, err := govalidator.ValidateStruct(newPass)
	if err != nil {
		log.Printf("validated: %t - validation error: %s", result, err.Error())
		utils.JsonErrorResponse(res, fmt.Errorf("The submitted pass data is malformed."), http.StatusBadRequest)
		return
	}

	//pass is new, generate a token id, otherwise verify token
	if newPass.Id == "" {
		newPass.Id = utils.GenerateToken(idTokenKey, newPass.Name, newPass.KeyDoc.OrganizationName) //get token from base64 hmac
	} else {
		if ok, err := utils.VerifyToken(idTokenKey, newPass.Id, newPass.Name, newPass.KeyDoc.OrganizationName); !ok {
			if err != nil {
				log.Printf("%s", err.Error()) //base64 decode failed
			} else {
				log.Printf("validated: %t - validation error: %s", result, err.Error())
			}
			utils.JsonErrorResponse(res, fmt.Errorf("The submitted pass data is malformed."), http.StatusBadRequest)
			return
		}
	}

	newPass.Updated = time.Now()

	if !db.Merge("pass", "id", newPass.Id, newPass) {
		log.Println("db Merge Error")
		utils.JsonErrorResponse(res, fmt.Errorf("A conflict has occured updating the pass."), http.StatusInternalServerError)
		return
	}

	receipt := map[string]string{"id": newPass.Id, "time": newPass.Updated.String()}
	err = utils.WriteJson(res, receipt, true)
	//utils.JsonErrorResponse(res, fmt.Errorf("none"), http.StatusOK) //save is successful!
}

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func handleAuthorize(c web.C, res http.ResponseWriter, req *http.Request) {

	log.Println("handleAuthorize")

	defer context.Clear(req)

	//get matching provider from url (gplus,facebook,etc)
	provider, err := goth.GetProvider(c.URLParams["provider"])
	if err != nil {
		log.Printf("provider oauth error: %s", err.Error())
		utils.JsonErrorResponse(res, fmt.Errorf("Ninja fail, Bad Request!"), http.StatusBadRequest)
		return
	}

	//creates the auth url with its query parameters
	sess, err := provider.BeginAuth()
	if err != nil {
		log.Printf("begin oauth error: %s", err.Error())
		utils.JsonErrorResponse(res, fmt.Errorf("Ninja fail, Bad Request!"), http.StatusBadRequest)
		return
	}

	//get the auth url to for the user to load and authorize at provider
	url, err := sess.GetAuthURL()
	if err != nil {
		log.Printf("get auth url error: %s", err.Error())
		utils.JsonErrorResponse(res, fmt.Errorf("Ninja fail, Bad Request!"), http.StatusBadRequest)
		return
	}

	session := initSession(req, oauthSessionName, "/")
	session.Values[oauthSessionName] = sess.Marshal() //save auth url in session
	err = session.Save(req, res)
	if err != nil {
		log.Printf("session save error: %s", err.Error())
		utils.JsonErrorResponse(res, fmt.Errorf("Ninja fail, Bad Request!"), http.StatusBadRequest)
		return
	}

	http.Redirect(res, req, url, http.StatusTemporaryRedirect)

}

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func handleCallBack(c web.C, res http.ResponseWriter, req *http.Request) {

	log.Println("handleCallback")

	db, err := utils.GetDbType(c)
	utils.Check(err)

	defer context.Clear(req)

	//get matching provider from url (gplus,facebook,etc)
	provider, err := goth.GetProvider(c.URLParams["provider"])
	if err != nil {
		log.Printf("provider oauth error: %s", err.Error())
		utils.JsonErrorResponse(res, fmt.Errorf("Ninja fail, Bad Request!"), http.StatusBadRequest)
		return
	}

	//get or init session from store
	oAuthsession := initSession(req, oauthSessionName, "/")

	//check that the saved session value from auth is present
	if oAuthsession.Values[oauthSessionName] == nil {
		log.Printf("session error: could not find a matching session value for this request")
		http.Redirect(res, req, "/", http.StatusFound)
		return
	}

	//unmarshal the values of session into a goth sess (authURL)
	sess, err := provider.UnmarshalSession(oAuthsession.Values[oauthSessionName].(string))
	if err != nil {
		log.Printf("session unmarshal error: %s", err.Error())
		http.Redirect(res, req, "/", http.StatusFound)
		return
	}

	//exchange the callback access code for an access token from provider
	accessToken, err := sess.Authorize(provider, req.URL.Query())
	if err != nil {
		log.Printf("session authorize error: %s", err.Error())
		http.Redirect(res, req, "/", http.StatusFound)
		return
	}

	loginSession := initSession(req, loginSessionName, "/accounts")

	// Check if the user is already connected, login if so
	storedToken := loginSession.Values["accessToken"]
	if storedToken != nil {
		log.Println("Current user already connected")
		http.Redirect(res, req, "/accounts/", http.StatusFound)
	}

	//If not logged in store the access token in the session for later use
	loginSession.Values["accessToken"] = accessToken
	err = loginSession.Save(req, res)
	if err != nil {
		log.Printf("session save error: %s", err.Error())
		utils.JsonErrorResponse(res, fmt.Errorf("Ohnos! Server Error!"), http.StatusInternalServerError)
		return
	}

	//fetch user info
	user, err := provider.FetchUser(sess)
	if err != nil {
		log.Printf("complete oauth error: %s", err.Error())
		utils.JsonErrorResponse(res, fmt.Errorf("Ninja fail, Server Error!"), http.StatusInternalServerError)
		return
	}

	newUser := userModel{}

	//check db for user
	if !db.FindByID("users", user.UserID, &newUser) {
		log.Println("User not found")

		//add new user
		newUser.Id = user.UserID
		newUser.Email = user.Email
		newUser.OAuthProvider = provider.Name()
		newUser.User = user //all details from oauth login
		newUser.Created = time.Now()

		if ok := db.Add("users", newUser); !ok {
			log.Println("Add User Error")
			utils.JsonErrorResponse(res, fmt.Errorf("This user account already exists."), http.StatusConflict)
			return
		}
	}

	//populate template with users info here

	http.Redirect(res, req, "/accounts/", http.StatusFound)

}

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func handleLogout(res http.ResponseWriter, req *http.Request) {

	//session, err := sessionStore.Get(req, "PassNinjaLogin")
	//if err != nil {
	//	log.Printf("login session error: %s", err)
	//	return
	//}

	// Set session values to nothing.
	//session.Values["email"] = ""
	//session.Values["page"] = ""

	//err = session.Save(req, res)
	//if err != nil {
	//	log.Printf("session save error: %s", err.Error())
	//	utils.JsonErrorResponse(res, fmt.Errorf("Ohnos! Server Error!"), http.StatusInternalServerError)
	//	return
	//}

	http.Redirect(res, req, "/index.html", 302)
}

//////////////////////////////////////////////////////////////////////////
//
// NotFound is a 404 handler.
//
//
//////////////////////////////////////////////////////////////////////////
func handleNotFound(res http.ResponseWriter, req *http.Request) {
	http.Error(res, "Umm... have you tried turning it off and on again?", 404) //TODO: add 404 error message
}

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func requireLogin(c *web.C, h http.Handler) http.Handler {

	fn := func(w http.ResponseWriter, r *http.Request) {

		log.Println("requireLogin ")

		session := initSession(r, loginSessionName, "/accounts")

		if val, ok := session.Values["accessToken"].(string); ok { // if val is a string

			switch val {
			case "":

				http.Redirect(w, r, "/", http.StatusFound)

			default: //load the page

				log.Println(val)
				log.Println(r.URL.String())
				h.ServeHTTP(w, r)
			}

		} else {

			// if val is not a string type
			http.Redirect(w, r, "/", http.StatusFound)
		}

	}

	return http.HandlerFunc(fn)

}

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func initSession(r *http.Request, sessionName string, sessionPath string) *sessions.Session {

	session, err := sessionStore.Get(r, sessionName)
	if err != nil {
		log.Printf("session error: %s", err.Error())
	}

	if session.IsNew { //Set some cookie options
		log.Println("new Session!")

		session.Options = &sessions.Options{
			Path:     sessionPath,
			MaxAge:   86400 * 2,
			HttpOnly: true,
			//Secure:   true,
			//Domain: http://pass.ninja
		}

	}
	return session
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

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func createRawURL(token string, userEmail string, expires string) string {

	u := url.URL{}
	u.Scheme = "https"
	u.Host = "pass.ninja"
	u.Path = "verify"
	q := u.Query()
	q.Add("email", userEmail)
	q.Add("expires", expires)

	q.Add("token", token)
	u.RawQuery = q.Encode()

	return u.String()

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

	templates.ExecuteTemplate(res, "layout", nil)

	return nil
}
