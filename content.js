'use strict';

class SAMLStarObj {
  constructor(form, elem) {
    this.currentForm = form;
    this.currentElement = elem;
  }
  decodeResponse() {
    this.currentResponse = atob(this.currentElement.value);
  }
  encodeResponse() {
    this.currentElement.value = btoa(this.currentResponse);
    console.log("XML Response:", this.currentResponse);
    console.log("Base64 Response:", this.currentElement.value);
  }
  parseResponseDom() {
    this.currentDom = (new DOMParser()).parseFromString(this.currentResponse, "text/xml");
    console.log("Updated SAMLStar.currentDom");
    return this.currentDom;
  }
  getNameID() {
    const ret = {};
    ret.element = this.currentDom.querySelector('NameID');
    ret.textContent = ret.element && ret.element.textContent;
    console.log(ret.element);
    return ret;
  }
  setNameIDContent(value) {
    this.currentResponse = this.currentResponse.replace(/(NameID[^>]*>)([^<]*)/, "$1" + value);
    this.parseResponseDom();
    return this.getNameID();
  }
}


let maybeSaml = false;
const req = { formElements: [] };
const nForms = document.forms.length;
if (nForms > 0) {
  console.log("looking at " + nForms + " forms.");
  for (let i = 0; i < nForms; ++i) {
    const form = document.forms[i];
    console.log("forms[" + i + "] =", form);
    const nElems = form.length;
    for (let j = 0; j < nElems; ++j) {
      const elem = form[j];
      console.log(" - ", elem);
      if (elem.name === "SAMLResponse") {
        let SAMLStar, origNameID;
        try {
          SAMLStar = new SAMLStarObj(form, elem);
          SAMLStar.decodeResponse();
          SAMLStar.parseResponseDom();
          origNameID = SAMLStar.getNameID().textContent;
        } catch (e) {
          console.log("Ignoring error parsing response:", e, SAMLStar);
        }

        if (origNameID !== undefined) {
          let c14nMethod = SAMLStar.currentDom.querySelector('Signature CanonicalizationMethod');
          let c14nAlgo = c14nMethod && c14nMethod.getAttribute('Algorithm')
          let possiblyVulnerable = !(c14nAlgo && c14nAlgo.endsWith('#WithComments'));

          const newNameID = prompt("You're about to be logged in as \"" + origNameID + "\".\n"
            + "You can:\n"
            + "- Leave it alone,\n"
            + "- change it" + (possiblyVulnerable
              ? (" (note that the canonicalization algorithm used on the signature, \""
                 + c14nAlgo + "\" is amenable to the comment-injection described in"
                 + " https://www.kb.cert.org/vuls/id/475445)")
              : "") + ", or\n"
            + "- clear it (empty) to be dropped into the Chrome debugger",
            origNameID);
          if (newNameID === "") {
            console.log("Welcome! Play with the 'SAMLStar' object. When you're done,"
            + " run \"SAMLStar.encodeResponse()\" and un-pause the debugger to proceed"
            + " with your adjusted SAML Response.");
            debugger;
          } else if (newNameID !== origNameID) {
            SAMLStar.setNameIDContent(newNameID);
            SAMLStar.encodeResponse();
          }
        }
      }
    }
  }
} 
