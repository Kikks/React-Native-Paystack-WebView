import * as React from 'react';
import { useState, useEffect, forwardRef, useRef, useImperativeHandle } from 'react';
import { Modal, View, ActivityIndicator, SafeAreaView } from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { getAmountValueInKobo, getChannels } from './helper';
import { PayStackProps, PayStackRef } from './types';
import Handlebars from 'handlebars';

const CLOSE_URL = 'https://standard.paystack.co/close';

const Paystack: React.ForwardRefRenderFunction<React.ReactNode, PayStackProps> = (
  {
    paystackKey,
    billingEmail,
    phone,
    lastName,
    firstName,
    amount = '0.00',
    currency = 'NGN',
    channels = ['card'],
    refNumber,
    billingName,
    handleWebViewMessage,
    onCancel,
    autoStart = false,
    onSuccess,
    activityIndicatorColor = 'green',
  },
  ref,
) => {
  const [isLoading, setisLoading] = useState(true);
  const [showModal, setshowModal] = useState(false);
  const webView = useRef(null);

  useEffect(() => {
    autoStartCheck();
  }, []);

  useImperativeHandle(ref, () => ({
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
  const calculatedAmount = getAmountValueInKobo(amount);
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

  const Paystackcontent = Handlebars.compile(template, {
    noEscape: true,
  });

  const messageReceived = (data: string) => {
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

  const onNavigationStateChange = (state: WebViewNavigation) => {
    const { url } = state;
    if (url === CLOSE_URL) {
      setshowModal(false);
    }
  };

  return (
    <Modal style={{ flex: 1 }} visible={showModal} animationType="slide" transparent={false}>
      <SafeAreaView style={{ flex: 1 }}>
        <WebView
          style={[{ flex: 1 }]}
          source={{
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
          }}
          onMessage={(e) => {
            messageReceived(e.nativeEvent?.data);
          }}
          onLoadStart={() => setisLoading(true)}
          onLoadEnd={() => setisLoading(false)}
          onNavigationStateChange={onNavigationStateChange}
          ref={webView}
          cacheEnabled={false}
          cacheMode={'LOAD_NO_CACHE'}
        />

        {isLoading && (
          <View>
            <ActivityIndicator size="large" color={activityIndicatorColor} />
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

export default forwardRef(Paystack);
