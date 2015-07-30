package main

import (
	"crypto/tls"
	"encoding/json"
	//"fmt"
	"github.com/emicklei/forest"
	"net/http"
	"testing"
)

var shw *forest.APITesting
var testPassID string
var testCompletePassID string

var testMutateList []interface{}

func init() {

	cfg := &tls.Config{
		InsecureSkipVerify: true,
	}

	tr := &http.Transport{TLSClientConfig: cfg}
	client := &http.Client{Transport: tr}

	shw = forest.NewClient("https://local.pass.ninja", client)

}

//will need to be refreshed during new tests. Will expire
var testJwToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE0Mzg0MzMyMjIsImlhdCI6MTQzODE3NDAyMiwic3ViIjoiMTA4NDUwODU0MjAwNjU5OTcxMTI2In0.zqiRRomTfQspHMHHvVyt0EkRzDlaW2crAddPPrc6Ovg`

//////////////////////////////////////////////////////////////////////////
//
//
//	Get All Pass
//
//////////////////////////////////////////////////////////////////////////
func TestGetAllPass(t *testing.T) {
	bearer := "Bearer " + testJwToken
	cfg := forest.NewConfig("/api/v1/passes").
		Header("Accept", "application/json").
		Header("Authorization", bearer)
	r := shw.GET(t, cfg)
	forest.ExpectStatus(t, r, 200)

}

func TestGetAllPassBadAuth(t *testing.T) {
	bearer := "Bearer " + "k39dk.jidiww.399f"
	cfg := forest.NewConfig("/api/v1/passes").
		Header("Accept", "application/json").
		Header("Authorization", bearer)
	r := shw.GET(t, cfg)
	forest.ExpectStatus(t, r, 401)

}

//////////////////////////////////////////////////////////////////////////
//
//	Create Pass
//
//
//////////////////////////////////////////////////////////////////////////
func TestCreatePass(t *testing.T) {
	bearer := "Bearer " + testJwToken
	cfg := forest.NewConfig("/api/v1/passes").
		Header("Accept", "application/json").
		Header("Authorization", bearer).
		Body(`{"name":"testpass","status":"2","passtype":"coupon","keyDoc":{"description":"A pass for testing","organizationName":"tester"}}`)
	r := shw.POST(t, cfg)
	forest.ExpectStatus(t, r, 201)
	forest.ExpectJSONHash(t, r, func(hash map[string]interface{}) {

		testPassID = hash["id"].(string)
	})

}

func TestCreateConflictPass(t *testing.T) {
	bearer := "Bearer " + testJwToken
	cfg := forest.NewConfig("/api/v1/passes").
		Header("Accept", "application/json").
		Header("Authorization", bearer).
		Body(`{"name":"testpass","status":"2","passtype":"coupon","keyDoc":{"description":"A pass for testing","organizationName":"tester"}}`)
	r := shw.POST(t, cfg)
	forest.ExpectStatus(t, r, 409)
}

func TestCreateMalformPass(t *testing.T) {
	bearer := "Bearer " + testJwToken
	cfg := forest.NewConfig("/api/v1/passes").
		Header("Accept", "application/json").
		Header("Authorization", bearer).
		Body(`{"bame":"testpass","passtype":"wiw","keyDoc":{"description":"A pass for testing","organizationName":"tester"}}`)
	r := shw.POST(t, cfg)
	forest.ExpectStatus(t, r, 422)
}

func TestCreateCompletePass(t *testing.T) {
	bearer := "Bearer " + testJwToken
	cfg := forest.NewConfig("/api/v1/passes").
		Header("Accept", "application/json").
		Header("Authorization", bearer).
		Body(`{
  "name": "deepdiscount",
  "passtype": "coupon",
  "keyDoc": {
    "description": "A super sale from Deep Discounts Co.",
    "organizationName": "Deep Discounts Co.",
    "locations": [{
      "latitude": 37.55346785983141,
      "longitude": 126.91327761858702
    }],
    "coupon": {
      "auxiliaryFields": [{
        "key": "valid",
        "label": "VALID THRU",
        "value": "2014-07-31T10:00-05:00",
        "dateStyle": "PKDateStyleShort",
        "isRelative": true
      }, {
        "key": "limit",
        "label": "LIMIT",
        "value": "1 Per Customer"
      }, {
        "key": "coupon",
        "label": "COUPON #",
        "value": 131
      }],
      "headerFields": [{
        "key": "headeroffer",
        "label": "OFFER",
        "value": "In-store"
      }],
      "primaryFields": [{
        "key": "primaryoffer",
        "label": "All Summer Sandals",
        "value": "40% off"
      }]
    },
    "barcode": {
      "format": "PKBarcodeFormatPDF417",
      "message": "1234566",
      "messageEncoding": "iso-8859-1"
    },
    "backgroundColor": "rgb(255, 28, 177)",
    "foregroundColor": "rgb(255, 255, 255)",
    "labelColor": "rgb(96, 57, 19)"
  },
  "images": [{
    "image": "data:image/png;base64,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",
    "name": "strip"
  }, {
    "image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAIfUlEQVR4nO2dW6gVVRjHf1aOZveyXioa7EqRREhUFAxWahbHAokMkRKfKiJMeu4xQqJCfKqMQw9hYSZhaWUTlITdqEzBLkxREiWlkR2bk9LDmi37zNn77Jk96zYz3++t2e1vLfz9mT1nzTezpiFoIYmCk4AFwDzgGPAxsCOM02NOJzaAaa4n0ASSKLgC2AhcnfvoM+CeME5/sD+rYkgAKpJEwTXAduDcPv/LL8D8ME732ZtVcSQAFUiiYC7wLv3ld/A2BBKAISkhv4OXIZAADMEQ8jt4FwIJQEkqyO/gVQgkACXQIL+DNyGQABREo/wOXoRAAlAAA/I7OA/BCa4GrgsG5QOcD1xpoG5hJABTYFg+wIYwTjcbql0ICUAfLMj/E1htqHZhJAA9sCAfYH0YpwcN1i+EBCCHJfnjwHMG6xdGAtBFdkt3HWblA3wcxulvhscohASgizBO/wMWAdsMD7XdcP3CSAByhHH6D3AX8I7BYXYZrF2K1gcgiYIwfyyM0yPAfcAhQ8P+bKhuaVodgKyZY1cSBUvzn4VxegDYbWjovw3VLU1rA5Dr5Hk5iYKR3OenAlcYGj4wVLc0J7megAt6tHHNADYmUfA4MAqcjfoz7RxDU5gNfGeodiladwaYoodvBvAsaoXue+AOg9O4zGDtUrQqAAUaOKfiMPA1MKZhKjdqqKGF1gSgovyPgDlhnM4F5gDvV5zOoiQKvPi392ISpqkoH+CRzspdGKe/AndSbZ3gImB+he9ro/EB0CAfYH/3f3QtFu2tUHNNhe9qo9EB0CQf4N78gSwEz1eouTCJggUVvq+FxgZAo3yAJ5MouLPH8VkV665PouD0ijUq0cgAaJYP6k/E17pXDJMomAM8XLHuxcCoywvCxjWFGpCf5yPgDyACTtNUcwOwysWTxI0KgAX5JnkDWBHG6V9VCyVRcBewp0i3cWN+AjyQvwG4Abgd+GSI7y8BPq9yYZhEwZlJFLwIvA7sSKJg4IpjI84AHsh/C1gcxmlnPrOAzcBtQ9bbBqyl4Asmkig4D3gEeBA4q+ujgc8d1D4AHsgHeCyM06e7DyRRMBM1r5sr1P0ReBvYCewDDgApcCpwAXAd6q0k1wPT+9SYMgS1DoAn8kH196/MH8zm94WD+eTpG4LaXgN4JB9gRZ91gsT2RPpwPn2uCWoZAM/kA5yIWidYnDs+qdPIIT1DULufAA/ld/MvqpHkQ9Tv82rgZKczmsyEn4NaBcBz+XXiFyAK4/S72gSgAfLHgU3Ab8AI6pawS74Grq1FABogH2BJGKdbALIbQJuAW9xOiWXeXwQ2RP7ejnyAbLl3BHjP3ZQAuMnrADREPvTovs76Ce4Bfrc/neP40ZfWiwbJB7g0iYJeTSV/4PYxsd1eXgM0TH6HMWBpGKdbOweyPoA9wOUO5nMIuMS7ADRUfocxVBPJS8BM4CngIQfzGEe9xHqzVwFouPxuDqMeD+t3A8ck46i+g1fAo6XgFskHOIX+8n8Hjhoad4J88CQALZPfj2+Bq8M4PQ8IgQ80158kHzxYChb5x1nSvVaQNZVsQc9iUU/54PgMIPInMOFp4WydYAT4pmLdvvLBYQBE/iQm9RNkIXimQs0p5YOjAIj8njyRRMEijfUGygcH1wCZ/Hcx9/KFOjOG+vv8TTh+02gncFXJOoXkg+UAiPxCHAW2oh5IXQxcWPL7heWDxQCIfCuUkg+WrgFEvjbeA+4GlgFf5j4rLR8snAFEvja+BOZlbzPNrxMMJR8MnwFEvla2duTDhHWCDxhSPhgMgMjXTjjpgArBrcPKB0M/ASLfCEeBke5+Ah1oPwOIfGN0Hj7RuVik9wwg8q1wGLgyjNOfdBTTdgYQ+VYYB1bqkg+azgAi3wrjwPIwTjfqLFo5ACLfCkbkQ8UAiHwrGJMPFQIg8q1gVD4MGQCRbwXj8mGIAIh8K1iRDyUDIPKtYE0+lAiAyLeCVflQMAAi3wrW5UOBAIh8KziRDwMCIPKt4Ew+TBEAkW8Fp/KhTwBEvhWcy4ceARD5VvBCPuQCIPKt4I186AqAyLeCV/IhC0ASBXOBHYh8k3gnH2Ba9l773agNjAQzeCkfVEvYckS+SbyVDyoAN7meRIPxWj6oAASuJ9FQvJcPKgBfuZ5EA6mFfFABGEX1mgt6qI18gBPCON0PrMTcu+naRK3kQ/ZgSDZhCUE1aicfJi8FrwBeRD2HJhSnlvKh980gCUE5aisf+t8OlhAUo9byYeqGkEEhGEdtdvA28Clqk8R/UOsKs4HLgBuBRbjfIMkEtZcPg1vCeoXgELAOeCaM0wODBsg2RZgPrAEWDj9Vr2iEfCjWFNodgheANWGcHhxmsGxr9PXU+95DY+RD8bbw5cCRME5fqzpg9vbLUWBJ1VoOaJR8cPS6+Oxn4XngARfjD0nj5IPD/QKyEGyiHmeCRsoHxxtGZD8Hn+P3NUFj5YPjDSOyHTQfdDmHATRaPniwZ1AYp9uBba7n0YPGywcPApCx1vUEcrRCPvgTgB3Aj64nkdEa+eBJAMI4PYZaUnZNq+SDJwHI2Ol4/NbJB78CsM/h2K2UD34FYOCNJUO0Vj74FYDUwZitlg9+BWCW5fFaLx/8CkBocSyRn+FTAOZZGkfkd+FTALTuhNEHkZ/D+fbxAEkUzEbtlDnd4DAivwe+nAEeReQ7wfkZIImCM1EdxWcYGkLkT4EPZ4C1iHxnuO4IWgq8aqi8yC+A6zPALMw8kCryC+K6JWwUWIXeEIj8Eji/CARIouB+VJt41WcRRX5JvAgAaAmByB8CbwIAlUIg8ofEqwDAUCEQ+RXwLgBQKgQivyJeBgAKhUDka8D1OkBfwjh9CVgBjPX4+DBwr8ivjrdngA5JFMxBPT52HXAM9VaSdTq3UG8z/wMNEHKSm+DHFQAAAABJRU5ErkJggg==",
    "name": "logo"
  }],
  "status": "ready"
}`)
	r := shw.POST(t, cfg)
	forest.ExpectStatus(t, r, 201)
	forest.ExpectJSONHash(t, r, func(hash map[string]interface{}) {

		testCompletePassID = hash["id"].(string)
	})

}

//////////////////////////////////////////////////////////////////////////
//
// Get Pass
//
//
//////////////////////////////////////////////////////////////////////////
func TestGetPass(t *testing.T) {
	bearer := "Bearer " + testJwToken
	cfg := forest.NewConfig("/api/v1/passes/{ID}", testPassID).
		Header("Accept", "application/json").
		Header("Authorization", bearer)
	r := shw.GET(t, cfg)
	forest.ExpectStatus(t, r, 200)

}

func TestGetBadIDPass(t *testing.T) {
	bearer := "Bearer " + testJwToken
	cfg := forest.NewConfig("/api/v1/passes/{ID}", "wnOoZP6On9nvRPOSGFq9M6nhUO3ncbH5nnzLlWaMYso=").
		Header("Accept", "application/json").
		Header("Authorization", bearer)
	r := shw.GET(t, cfg)
	forest.ExpectStatus(t, r, 404)

}

//////////////////////////////////////////////////////////////////////////
//
// Get Link
//
//
//////////////////////////////////////////////////////////////////////////
func TestGetCompletePassLink(t *testing.T) {
	bearer := "Bearer " + testJwToken
	cfg := forest.NewConfig("/api/v1/passes/{ID}/link", testCompletePassID).
		Header("Accept", "application/json").
		Header("Authorization", bearer)
	r := shw.GET(t, cfg)
	forest.ExpectStatus(t, r, 200)

}

func TestGetIncompletePassLink(t *testing.T) {
	bearer := "Bearer " + testJwToken
	cfg := forest.NewConfig("/api/v1/passes/{ID}/link", testPassID).
		Header("Accept", "application/json").
		Header("Authorization", bearer)
	r := shw.GET(t, cfg)
	forest.ExpectStatus(t, r, 403)

}

func TestGetBadIDPassLink(t *testing.T) {
	bearer := "Bearer " + testJwToken
	cfg := forest.NewConfig("/api/v1/passes/{ID}/link", "wnOoZP6On9nvRPOSGFq9M6nhUO3ncbH5nnzLlWaMYso=").
		Header("Accept", "application/json").
		Header("Authorization", bearer)
	r := shw.GET(t, cfg)
	forest.ExpectStatus(t, r, 404)

}

//////////////////////////////////////////////////////////////////////////
//
//	Update Pass
//
//
//////////////////////////////////////////////////////////////////////////
func TestUpdatePass(t *testing.T) {
	bearer := "Bearer " + testJwToken
	cfg := forest.NewConfig("/api/v1/passes/{ID}", testPassID).
		Header("Accept", "application/json").
		Header("Authorization", bearer).
		Body(`{"name":"testpass","status":"2", "keyDoc": {"labelColor": "rgb(255,255,255)","foregroundColor": "rgb(240,34,19)","backgroundColor": "rgb(119,20,234)"}}`)
	r := shw.PATCH(t, cfg)
	forest.ExpectStatus(t, r, 200)

}

func TestUpdateBadPass(t *testing.T) {
	bearer := "Bearer " + testJwToken
	cfg := forest.NewConfig("/api/v1/passes/{ID}", testPassID).
		Header("Accept", "application/json").
		Header("Authorization", bearer).
		Body(`{"status":"2", "keyDoc": {"labelColor": "rgb(255,255,255)","foregroundColor": "rgb(240,34,19)","backgroundColor": "rgb(119,20,234)"}}`)
	r := shw.PATCH(t, cfg)
	forest.ExpectStatus(t, r, 400)

}

func TestUpdateInvalidPass(t *testing.T) {
	bearer := "Bearer " + testJwToken
	cfg := forest.NewConfig("/api/v1/passes/{ID}", testPassID).
		Header("Accept", "application/json").
		Header("Authorization", bearer).
		Body(`{"name":"testpass","status":"2", "keyDoc": {"labelColor": "white","foregroundColor": "#fff","backgroundColor": "rgb(119,20,234)"}}`)
	r := shw.PATCH(t, cfg)
	forest.ExpectStatus(t, r, 422)

}

//////////////////////////////////////////////////////////////////////////
//
//	Mutate Pass
//
//
//////////////////////////////////////////////////////////////////////////
func TestUpdateForMutatePass(t *testing.T) {
	bearer := "Bearer " + testJwToken
	cfg := forest.NewConfig("/api/v1/passes/{ID}", testCompletePassID).
		Header("Accept", "application/json").
		Header("Authorization", bearer).
		Body(`{"name": "deepdiscount","status":"api", "mutatelist": ["limit","coupon"]}`)
	r := shw.PATCH(t, cfg)
	forest.ExpectStatus(t, r, 200)

}

func TestGetMutateList(t *testing.T) {
	bearer := "Bearer " + testJwToken
	cfg := forest.NewConfig("/api/v1/passes/{ID}/mutate", testCompletePassID).
		Header("Accept", "application/json").
		Header("Authorization", bearer)
	r := shw.GET(t, cfg)
	forest.ExpectStatus(t, r, 200)
	forest.ExpectJSONHash(t, r, func(hash map[string]interface{}) {
		testMutateList = hash["mutatelist"].([]interface{})
		//fmt.Printf("%v", testMutateList)
	})

}

func TestMutatePass(t *testing.T) {

	mutateObject := make(map[string]string)
	for i, _ := range testMutateList {
		listItem := testMutateList[i].(string)
		mutateObject[listItem] = "foo"
	}
	mutateJson, _ := json.Marshal(mutateObject)

	bearer := "Bearer " + testJwToken
	cfg := forest.NewConfig("/api/v1/passes/{ID}/mutate", testCompletePassID).
		Header("Accept", "application/json").
		Header("Authorization", bearer).
		Body(string(mutateJson))
	r := shw.PATCH(t, cfg)
	forest.ExpectStatus(t, r, 200)
	/*forest.ExpectJSONHash(t, r, func(hash map[string]interface{}) {

		passurl := hash["url"].(string)
		fmt.Printf("%v", passurl)
	})*/

}

//////////////////////////////////////////////////////////////////////////
//
//	Delete Pass
//
//
//////////////////////////////////////////////////////////////////////////
func TestDeletePass(t *testing.T) {
	bearer := "Bearer " + testJwToken
	cfg := forest.NewConfig("/api/v1/passes/{ID}", testPassID).
		Header("Accept", "application/json").
		Header("Authorization", bearer)
	r := shw.DELETE(t, cfg)
	forest.ExpectStatus(t, r, 204)

}

func TestDeleteCompletePass(t *testing.T) {
	bearer := "Bearer " + testJwToken
	cfg := forest.NewConfig("/api/v1/passes/{ID}", testCompletePassID).
		Header("Accept", "application/json").
		Header("Authorization", bearer)
	r := shw.DELETE(t, cfg)
	forest.ExpectStatus(t, r, 204)

}
