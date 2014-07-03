package main

import (
	"bitbucket.org/cicadaDev/utils"
	"code.google.com/p/go.crypto/bcrypt"
	"fmt"
	"github.com/gorilla/sessions"
	"github.com/zenazn/goji"
	"github.com/zenazn/goji/web"
	"html/template"
	"log"
	"net/http"
	"net/url"
	"os"
	"path"
	"regexp"
	"strconv"
	"time"
)

//userModel can be any struct that represents a user in a system
type userModel struct {
	Email         string    `form:"email" gorethink:"email"`                         //Email is ID of user
	Password      []byte    `form:"password" gorethink:"password,omitempty"`         //bcrypted
	Organization  string    `form:"organization" gorethink:"organization,omitempty"` //User organization name
	OAuth         bool      `form:"_" gorethink:"oauth"`                             //User is using OAuth login, not email
	Authenticated bool      `form:"-" gorethink:"-"`                                 //User is Authenticated
	Verified      bool      `form:"_" gorethink:"verified,omitempty"`                //Email is verified
	Created       time.Time `form:"_" gorethink:"created,omitempty"`                 //Account Created time/date
	LastLogin     time.Time `form:"-" gorethink:"lastLogin,omitempty"`               //Last login time
	Subscriber    bool      `form:"_" gorethink:"subscriber,omitempty"`              //subscriber: true or false? (false could be free trial users)
	SubStart      time.Time `form:"_" gorethink:"subStart,omitempty"`                //Subscription start date
	SubExpiration time.Time `form:"_" gorethink:"subExpire,omitempty"`               //Subscription expiration date
	SubPlan       string    `form:"_" gorethink:"subPlan,omitempty"`                 //Subscription plan for this user
	PassList      []string  `form:"_" gorethink:"passList,omitempty"`                //A list of the pass Ids this users has made
}

var authKey = []byte("somesecret")      // Cookie Authorization Key
var encKey = []byte("someothersecret1") //Cookie Encryption Key - 16,24,32 bytes required!
var store = sessions.NewCookieStore(authKey, encKey)

var emailTokenKey = "something-secret" //key for email verification hmac

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func main() {

	//println(runtime.Version())

	goji.Post("/signup", handleSignUp)
	goji.Post("/login", handleLogin)

	goji.Get("/assets/*", handleStatic)
	//goji.Get("/accounts/*", handleTemplates)
	goji.Get("/verify", handleVerify)
	goji.Get("/index.html", handleTemplates)
	goji.Get("/landing.html", handleTemplates)
	goji.Get("/register_pure.html", handleTemplates)

	//login pages
	accounts := web.New()
	goji.Handle("/accounts/*", accounts) //handle all things that require login
	accounts.Use(requireLogin)           //login check middleware

	accounts.Get("/accounts/index.html", handleAccountTemplates)                     //login root, view current passes
	accounts.Get("/accounts/template/:passType/:passId", handleAccountPassStructure) //return a json object of the pass type
	accounts.Get("/accounts/builder.html", handleAccountTemplates)                   //make a pass
	accounts.Post("/accounts/save", handleAccountSave)                               //save pass data

	goji.NotFound(handleNotFound)

	goji.Use(utils.AddDb)

	goji.Serve() //set port via cl - example: app -bind :9000
}

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func handleTemplates(res http.ResponseWriter, req *http.Request) {

	log.Printf("handleTemplates: %s \n", req.URL.Path)

	err := createFromTemplate(res, "layout.tmpl", req.URL.Path)
	if err != nil {
		log.Printf("template error %s", err)
		http.NotFound(res, req)
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

	err := createFromTemplate(res, "accountLayout.tmpl", req.URL.Path)
	if err != nil {
		log.Printf("template error %s", err)
		http.NotFound(res, req)
		return
	}

}

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func handleVerify(c web.C, res http.ResponseWriter, req *http.Request) {

	values := req.URL.Query()
	emailAddr := values.Get("email")
	emailToken := values.Get("token")
	emailExpire := values.Get("expires")

	var pageContent string

	if ok, err := utils.VerifyToken(emailTokenKey, emailToken, emailAddr, emailExpire); !ok {

		if err != nil {
			log.Printf("%s", err) //base64 decode failed
		} else {
			log.Printf("email token: %s. failed verification", emailToken) //hmac failed
		}
		pageContent = "verifyFail.html"
	} else {
		pageContent = "verifyOk.html"
		//TODO: set Verifiy in DB!
	}

	err := createFromTemplate(res, "layout.tmpl", pageContent)
	if err != nil {
		log.Printf("template error %s", err)
		http.NotFound(res, req)
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

	fs := http.FileServer(http.Dir("public"))
	files := http.StripPrefix("/assets/", fs)

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
	if passType == "coupon" {
		templateID = "pass.com.apple.devpubs.pawPlanet123"
	} else {
		log.Println("Pass type not found")
		utils.JsonErrorResponse(res, fmt.Errorf("Pass not found"), http.StatusBadRequest)
		return
	}

	newPass := pass{}

	if !db.FindByID("pass", templateID, &newPass) {
		log.Println("Pass type not found")
		utils.JsonErrorResponse(res, fmt.Errorf("Pass not found"), http.StatusBadRequest)
		return
	}

	passId := c.URLParams["passId"]
	newPass.Id = "pass.ninja." + passId + ".coupon"

	err = utils.WriteJson(res, newPass)
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

	if !db.Merge("pass", "id", newPass.Id, newPass) {
		log.Println("db Merge Error")
		utils.JsonErrorResponse(res, fmt.Errorf("A conflict has occured updating the pass."), http.StatusInternalServerError)
		return
	}

	utils.JsonErrorResponse(res, fmt.Errorf("none"), http.StatusOK) //save is successful!
}

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func handleSignUp(c web.C, res http.ResponseWriter, req *http.Request) {

	db, err := utils.GetDbType(c)
	utils.Check(err)

	log.Println("handleSignup")
	user := userModel{}

	//get form data
	email, password := req.FormValue("email"), req.FormValue("password") //TODO: Sanitize forms

	if ok := sanitizeEmail(email); !ok {
		log.Printf("Invalid email address %s", email)
		utils.JsonErrorResponse(res, fmt.Errorf("Invalid email"), http.StatusBadRequest)
		return
	}

	defer clearPassMemory([]byte(password))
	user.setPassword(password)
	user.Email = email
	user.Created = time.Now()
	user.Verified = false
	user.OAuth = false //email signup, not Oauth

	log.Printf("pass:%s email:%s", user.Password, user.Email)

	if ok := db.Add("users", user); !ok {
		log.Println("Add User Error")
		utils.JsonErrorResponse(res, fmt.Errorf("This user account already exists."), http.StatusConflict)
		return
	}

	expiration := strconv.FormatInt(user.Created.AddDate(0, 0, 1).Unix(), 10) //token expires in 24 hours
	emailtoken := utils.GenerateToken(emailTokenKey, user.Email, expiration)  //get token from base64 hmac

	url := createRawURL(emailtoken, user.Email, expiration) //generate verification url

	emailVerify := NewEmailer()
	go emailVerify.Send(user.Email, emailtoken, url) //send concurrently

	//signup success. Redirect to /accounts - send email verification
	http.Redirect(res, req, "/accounts/verify.html", http.StatusCreated)

}

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func handleLogin(c web.C, res http.ResponseWriter, req *http.Request) {

	db, err := utils.GetDbType(c)
	utils.Check(err)

	log.Println("handleLogin")

	user := userModel{}

	email, password := req.FormValue("email"), req.FormValue("password") //TODO: Sanitize forms

	//check email with regex
	if ok := sanitizeEmail(email); !ok {
		log.Printf("malformed email address %s", email)
		utils.JsonErrorResponse(res, fmt.Errorf("Invalid email or password."), http.StatusUnauthorized)
		return
	}

	//check db for user
	if !db.FindByID("users", email, &user) {
		log.Println("User not found")
		//jsonErrorResponse(res, fmt.Errorf("Invalid email or password."), http.StatusUnauthorized)
		//return -- Check password, so operation takes equal time, even if user is not found
	}

	//check password
	defer clearPassMemory([]byte(password))
	if err != nil || bcrypt.CompareHashAndPassword(user.Password, []byte(password)) != nil {
		log.Println("Password doesn't match")
		utils.JsonErrorResponse(res, fmt.Errorf("Invalid email or password."), http.StatusUnauthorized)
		return
	}

	//create and save session
	session := initSession(req)
	// Set session values.
	session.Values["email"] = user.Email
	session.Values["page"] = "view"
	// Save it.

	err = store.Save(req, res, session)
	//err = session.Save(req, res)
	if err != nil {
		log.Printf("session save error: %s", err.Error())
		utils.JsonErrorResponse(res, fmt.Errorf("Ohnos! Server Error!"), http.StatusInternalServerError)
		return
	}

	fmt.Println("Session after login:")
	fmt.Println(session)

	http.Redirect(res, req, "/accounts/index.html", http.StatusOK)
	return

}

//////////////////////////////////////////////////////////////////////////
//
// NotFound is a 404 handler.
//
//
//////////////////////////////////////////////////////////////////////////
func handleNotFound(w http.ResponseWriter, r *http.Request) {
	http.Error(w, "Umm... have you tried turning it off and on again?", 404) //TODO: add 404 error message
}

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func requireLogin(c *web.C, h http.Handler) http.Handler {

	log.Println("requireLogin")

	fn := func(w http.ResponseWriter, r *http.Request) {

		session, err := store.Get(r, "PassNinjaLogin")
		if err != nil {
			log.Printf("login session error: %s", err)
			return
		}

		if session.IsNew { //there is no set session, require login
			http.Redirect(w, r, "/index.html", http.StatusUnauthorized)
			return
		}

		userEmail := session.Values["email"]

		log.Println(userEmail)
		log.Println(r.URL.String())

		h.ServeHTTP(w, r)
	}

	return http.HandlerFunc(fn)

}

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func initSession(r *http.Request) *sessions.Session {

	session, err := store.Get(r, "PassNinjaLogin") // Don't ignore the error in real code
	if err != nil {
		log.Printf("session error: %s", err.Error())
	}

	if session.IsNew { //Set some cookie options
		log.Println("new Session!")

		session.Options = &sessions.Options{
			Path:     "/accounts",
			MaxAge:   86400 * 2,
			HttpOnly: true,
			//Secure:   true,
		}

		//session.Options.Domain = "pass.ninja"

	}
	return session
}

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func (u *userModel) setPassword(password string) {

	//bcrypt password
	defer clearPassMemory([]byte(password))
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), 12) //cost ~400ms on mac-air
	utils.Check(err)
	u.Password = hashedPassword

}

//////////////////////////////////////////////////////////////////////////
//
//
// clearPassMemory
//
//////////////////////////////////////////////////////////////////////////
func clearPassMemory(b []byte) {
	//write over the memory where the password was stored.
	for i := 0; i < len(b); i++ {
		b[i] = 0
	}
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
func createFromTemplate(res http.ResponseWriter, layout string, file string) error {

	fp := path.Join("templates", file)
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

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func sanitizeEmail(email string) bool {

	//http://www.w3.org/TR/html5/forms.html#valid-e-mail-address-list
	emailRegex := "^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$"
	r := regexp.MustCompile(emailRegex)

	log.Println(email)

	return r.MatchString(email)

}
