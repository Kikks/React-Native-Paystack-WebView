"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const React = __importStar(require("react"));
const react_1 = require("react");
const react_native_1 = require("react-native");
const react_native_webview_1 = require("react-native-webview");
const helper_1 = require("./helper");
const handlebars_1 = __importDefault(require("handlebars"));
const CLOSE_URL = 'https://standard.paystack.co/close';
const Paystack = ({ paystackKey, billingEmail, phone, lastName, firstName, amount = '0.00', currency = 'NGN', channels = ['card'], refNumber, billingName, handleWebViewMessage, onCancel, autoStart = false, onSuccess, activityIndicatorColor = 'green', }, ref) => {
    const [isLoading, setisLoading] = react_1.useState(true);
    const [showModal, setshowModal] = react_1.useState(false);
    const webView = react_1.useRef(null);
    react_1.useEffect(() => {
        autoStartCheck();
    }, []);
    react_1.useImperativeHandle(ref, () => ({
        startTransaction() {
            setshowModal(true);
        },
        endTransaction() {
            setshowModal(false);
        },
    }));
    const autoStartCheck = () => {
        if (autoStart) {
            setshowModal(true);
        }
    };
    const refNumberString = refNumber ? `ref: '${refNumber}',` : ''; // should only send ref number if present, else if blank, paystack will auto-generate one
    const calculatedAmount = helper_1.getAmountValueInKobo(amount);
    const stringifiedChannels = JSON.stringify(channels);
    const fullName = firstName + '' + lastName;
    const template = `   
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta http-equiv="X-UA-Compatible" content="ie=edge" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            body {
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 2rem;
              font-family: sans-serif;
            }

            div {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              text-align: center;
            }

            span {
              font-size: 1rem;
              margin-bottom: 1rem;
            }

            button {
              font-family: sans-serif;
              font-size: 0.8rem;
              outline: none;
              border: none;
              border-radius: 0.4rem;
              background: linear-gradient(180deg, #44b669 0, #40ad57);
              padding: 0.7rem 1.5rem;
              color: #fff;
            }
          </style>
          <title>Paystack</title>
        </head>
        <body style="background-color: #fff; height: 100vh">
          <script type="text/javascript">
            function handleError() {
              var body = document.querySelector("body");
              body.innerHTML = ${`
                  <div class="container">
                    <span class="title">Something went wrong, please refresh.</span>
                    <button class="button" onclick="location.reload()">Refresh</button>
                  </div>
                `}
            }
          </script>
          <script
            src="https://js.paystack.co/v1/inline.js"
            onload='(function() {
              var handler = PaystackPop.setup({
                key: {{paystackKey}},
                email: {{billingEmail}},
                firstname: {{firstName}},
                lastname: {{lastName}},
                phone: {{phone}},
                amount: {{calculatedAmount}}, 
                currency: {{currency}},
                channels: {{stringifiedChannels}},
                {{refNumberString}},
                metadata: {
                custom_fields: [
                        {
                        display_name:  {{fullName}},
                        variable_name:  {{billingName}},
                        value:""
                        }
                ]},
                callback: function(response){
                      var resp = {event:"successful", transactionRef:response};
                        window.ReactNativeWebView.postMessage(JSON.stringify(resp))
                },
                onClose: function(){
                    var resp = {event:"cancelled"};
                    window.ReactNativeWebView.postMessage(JSON.stringify(resp))
                }
              });
              handler.openIframe();
            })()'
            onerror='(function() {
              var body = document.querySelector("body");
              body.innerHTML = "<div><span>Something went wrong, please refresh.</span><button>Refresh</button></div>"
							document.querySelector("button").addEventListener("click", function() {
								location.reload()
							})
            })()'
          ></script>
        </body>
      </html>
      `;
    const Paystackcontent = handlebars_1.default.compile(template, {
        noEscape: true,
    });
    const messageReceived = (data) => {
        const webResponse = JSON.parse(data);
        if (handleWebViewMessage) {
            handleWebViewMessage(data);
        }
        switch (webResponse.event) {
            case 'cancelled':
                setshowModal(false);
                onCancel({ status: 'cancelled' });
                break;
            case 'successful':
                setshowModal(false);
                const reference = webResponse.transactionRef;
                if (onSuccess) {
                    onSuccess({
                        status: 'success',
                        transactionRef: reference,
                        data: webResponse,
                    });
                }
                break;
            default:
                if (handleWebViewMessage) {
                    handleWebViewMessage(data);
                }
                break;
        }
    };
    const onNavigationStateChange = (state) => {
        const { url } = state;
        if (url === CLOSE_URL) {
            setshowModal(false);
        }
    };
    return (<react_native_1.Modal style={{ flex: 1 }} visible={showModal} animationType="slide" transparent={false}>
      <react_native_1.SafeAreaView style={{ flex: 1 }}>
        <react_native_webview_1.WebView style={[{ flex: 1 }]} source={{
            html: Paystackcontent({
                paystackKey,
                billingEmail,
                billingName,
                firstName,
                lastName,
                fullName,
                refNumberString,
                calculatedAmount,
                stringifiedChannels,
                phone,
                currency,
            }),
        }} onMessage={(e) => {
            messageReceived(e.nativeEvent?.data);
        }} onLoadStart={() => setisLoading(true)} onLoadEnd={() => setisLoading(false)} onNavigationStateChange={onNavigationStateChange} ref={webView} cacheEnabled={false} cacheMode={'LOAD_NO_CACHE'}/>

        {isLoading && (<react_native_1.View>
            <react_native_1.ActivityIndicator size="large" color={activityIndicatorColor}/>
          </react_native_1.View>)}
      </react_native_1.SafeAreaView>
    </react_native_1.Modal>);
};
exports.default = react_1.forwardRef(Paystack);
//# sourceMappingURL=paystack.js.map