package main

import (
	"bitbucket.org/cicadaDev/utils"
	"bytes"
	"encoding/json"
	log "github.com/Sirupsen/logrus"
	"net/smtp"
	"text/template"
	"time"
)

type emailer struct {
	Server   *emailServer
	Template smtpTemplate
	Auth     smtp.Auth
	EmailDoc bytes.Buffer
}

type emailServer struct {
	Username string
	Password string
	Address  string
	URL      string
	Port     string
}

type smtpTemplate struct {
	From        string
	To          string
	Subject     string
	UserName    string
	UserEmail   string
	UserSubPlan int
	UserReq     string
	SendTime    time.Time
	Message     string
}

const emailTemplate = `From: {{.From}}
To: {{.To}}}
Subject: {{.Subject}}

User name: {{.UserName}}
User email: {{.UserEmail}}
User subscription: {{.UserSubPlan}}
Browser Request Info: {{.UserReq}}
Time sent: {{.SendTime}}

{{.Message}}
`

//////////////////////////////////////////////////////////////////////////
//
// NewEmailer returns the emailer struct used for sending feedback email
//
//
//////////////////////////////////////////////////////////////////////////
func NewEmailer() *emailer {
	return &emailer{}
}

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func (mail *emailer) Init() {

	//load crypt pass key from json file
	var emailMap map[string]interface{}
	emailVar, err := utils.GetCryptKey(secretKeyRing, "/email/feedback")
	if err != nil {
		log.Errorf("error accessing etcd email crypt %s", err.Error())
	}
	err = json.Unmarshal(emailVar, &emailMap)
	if err != nil {
		log.Errorf("error unmarshalling email key info: %s", err)
	}

	username := emailMap["username"].(string)
	pw := emailMap["pass"].(string)
	addr := emailMap["address"].(string)
	url := emailMap["url"].(string)
	port := emailMap["port"].(string)

	server := &emailServer{username, pw, addr, url, port}
	mail.Server = server

}

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func (mail *emailer) Send(feedBackType string, userName string, userEmail string, userSubPlan int, userReq string, message string) {

	mail.connect()
	mail.create(feedBackType, userName, userEmail, userSubPlan, userReq, message)
	mail.deliver(mail.Server.Address)
	mail.EmailDoc.Reset() //its sent clear the buffer
}

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func (mail *emailer) connect() {

	mail.Auth = smtp.PlainAuth("", mail.Server.Username, mail.Server.Password, mail.Server.URL)

}

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func (mail *emailer) create(feedBackType string, userName string, userEmail string, userSubPlan int, userReq string, message string) {

	context := &smtpTemplate{
		"User Feedback",
		"Pass Ninja Support",
		feedBackType,
		userName,
		userEmail,
		userSubPlan,
		userReq,
		time.Now(),
		message,
	}

	//create the template from the string. Could load from a file?
	t := template.New("emailTemplate")

	//parse the template
	t, err := t.Parse(emailTemplate)
	if err != nil {
		log.Errorf("%s", err.Error())
	}

	err = t.Execute(&mail.EmailDoc, context)
	if err != nil {
		log.Errorf("%s", err.Error())
	}
}

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func (mail *emailer) deliver(userEmail string) {

	addressPort := mail.Server.URL + ":" + mail.Server.Port // in our case, "smtp.google.com:587"

	err := smtp.SendMail(addressPort, mail.Auth, mail.Server.Username, []string{userEmail}, mail.EmailDoc.Bytes())
	if err != nil {
		log.Errorf("%s", err.Error())
	}
}
