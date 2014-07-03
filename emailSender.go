package main

import (
	"bitbucket.org/cicadaDev/utils"
	"bytes"
	"net/smtp"
	"os"
	"text/template"
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
	Port     string
}

type smtpTemplate struct {
	From      string
	To        string
	Subject   string
	VerifyURL string
}

const emailTemplate = `From: {{.From}}
To: {{.To}}}
Subject: {{.Subject}}
Welcome to Pass Ninja!

Verify yourself and Lets make some passes!
To get started, click the link below:

{{.VerifyURL}}

Sincerely,
{{.From}}
`

//////////////////////////////////////////////////////////////////////////
//
//
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
func (mail *emailer) Send(to string, token string, url string) {
	mail.connect()
	mail.create(to, token, url)
	mail.deliver(to)
}

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func (mail *emailer) connect() {

	username := os.Getenv("PASS_APP_EMAIL_USERNAME")
	pw := os.Getenv("PASS_APP_EMAIL_PW")
	url := os.Getenv("PASS_APP_EMAIL_URL")
	port := os.Getenv("PASS_APP_EMAIL_PORT")

	server := &emailServer{username, pw, url, port}
	mail.Server = server
	mail.Auth = smtp.PlainAuth("", server.Username, server.Password, server.Address)

}

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func (mail *emailer) create(to string, token string, url string) {

	context := &smtpTemplate{
		"Pass Ninja",
		to,
		"Email Verification",
		url,
	}

	//create the template from the string. Could load from a file?
	t := template.New("emailTemplate")

	//parse the template
	t, err := t.Parse(emailTemplate)
	utils.Check(err)

	err = t.Execute(&mail.EmailDoc, context)
	utils.Check(err)
}

//////////////////////////////////////////////////////////////////////////
//
//
//
//
//////////////////////////////////////////////////////////////////////////
func (mail *emailer) deliver(userEmail string) {

	addressPort := mail.Server.Address + ":" + mail.Server.Port // in our case, "smtp.google.com:587"

	err := smtp.SendMail(addressPort, mail.Auth, mail.Server.Username, []string{userEmail}, mail.EmailDoc.Bytes())
	utils.Check(err)
}
