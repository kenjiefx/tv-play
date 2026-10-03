import {
  PluncAppInstance,
  MainScope,
  PatchAPI,
  SignatureService,
  SignatureViewer,
  TrustedVendorsParams,
  SignatureViewerScope,
  SubmissionMethodScope,
  SubmissionMethod,
  SubmissionMethodType,
  AppAPI,
  ToastNotification,
  BlockAPI,
} from "./types";

(function () {
  // @ts-expect-error - global variable
  const app = plunc.create("App") as PluncAppInstance;

  app.service<SignatureService>("SignatureService", () => {
    return {
      generateHMAC: async (
        p: {
          reviewerEmail: string;
          reviewerType: "verified_buyer" | "verified_reviewer";
          productId: string;
          timestamp: number;
        },
        secretKey: string,
      ): Promise<string> => {
        const message =
          p.reviewerType === "verified_buyer"
            ? `${p.reviewerEmail}${p.reviewerType}${p.productId}${p.timestamp}`
            : `${p.reviewerEmail}${p.reviewerType}${p.timestamp}`;
        const encoder = new TextEncoder();
        const keyData = encoder.encode(secretKey);
        const messageData = encoder.encode(message);
        const cryptoKey = await window.crypto.subtle.importKey(
          "raw",
          keyData,
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"],
        );
        const signatureBuffer = await window.crypto.subtle.sign(
          "HMAC",
          cryptoKey,
          messageData,
        );
        const hashArray = Array.from(new Uint8Array(signatureBuffer));
        const hexSignature = hashArray
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        return hexSignature;
      },
      generateSHA256: async (p: {
        reviewerEmail: string;
        reviewerType: "verified_buyer" | "verified_reviewer";
        productId: string;
        timestamp: number;
        secretKey: string;
      }): Promise<string> => {
        const message =
          p.reviewerType === "verified_buyer"
            ? `${p.reviewerEmail}${p.reviewerType}${p.productId}${p.timestamp}${p.secretKey}`
            : `${p.reviewerEmail}${p.reviewerType}${p.timestamp}${p.secretKey}`;
        const encoder = new TextEncoder();
        const data = encoder.encode(message);
        const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hexHash = hashArray
          .map((byte) => byte.toString(16).padStart(2, "0"))
          .join("");

        return hexHash;
      },
    };
  });

  app.component(
    "Main",
    (
      $scope: MainScope,
      SignatureService: SignatureService,
      SignatureViewer: SignatureViewer,
      SubmissionMethod: SubmissionMethod,
      ToastNotification: ToastNotification,
      $patch: PatchAPI,
      $app: AppAPI,
    ) => {
      $scope.timestamp = Date.now();
      $scope.reviewerType = "verified_buyer";
      $scope.digestAlgorithm = "HMAC";
      $scope.appKey = "";
      $scope.secretKey = "";
      $scope.reviewerEmail = "";
      $scope.productId = "";
      $scope.signature = "";
      $scope.secretKeyInputType = "password";
      $scope.toggleSecretKeyInputType = () => {
        $scope.secretKeyInputType =
          $scope.secretKeyInputType === "password" ? "text" : "password";
        $patch("SecretKeyInputField");
      };
      $app.ready(async () => {
        $scope.isDarkMode = localStorage.getItem("isDarkMode") === "true";
        await $patch("DarkModeToggler");
      });
      $scope.toggleDarkMode = async () => {
        const isDarkMode = !(localStorage.getItem("isDarkMode") === "true");
        localStorage.setItem("isDarkMode", isDarkMode.toString());
        $scope.isDarkMode = isDarkMode;
        document.body.classList.toggle("dark-mode", isDarkMode);
        await $patch("DarkModeToggler");
      };
      $scope.fillDemoData = async () => {
        $scope.appKey = "demoAppKey";
        $scope.secretKey = "demoSecretKey";
        $scope.reviewerEmail = "demo@example.com";
        $scope.productId = "demoProductId";
        $scope.reviewerType = "verified_buyer";
        $scope.digestAlgorithm = "HMAC";
        $scope.timestamp = Date.now();
        $scope.signature = await SignatureService.generateHMAC(
          {
            reviewerEmail: $scope.reviewerEmail,
            reviewerType: $scope.reviewerType,
            productId: $scope.productId,
            timestamp: $scope.timestamp,
          },
          $scope.secretKey,
        );
        await $patch();
        SignatureViewer.setSignature($scope.signature, $scope);
        SubmissionMethod.setParams($scope);
        ToastNotification.showToast(
          "Demo data populated and signature generated!",
        );
      };
      $scope.onUpdate = () => {
        const {
          appKey,
          secretKey,
          reviewerEmail,
          productId,
          reviewerType,
          digestAlgorithm,
          timestamp,
          signature,
        } = $scope;
        if (
          appKey === "" ||
          secretKey === "" ||
          reviewerEmail === "" ||
          productId === ""
        ) {
          console.error("All fields are required.");
          return;
        }
        if (digestAlgorithm === "SHA256") {
          SignatureService.generateSHA256({
            reviewerEmail,
            reviewerType,
            productId,
            timestamp,
            secretKey,
          }).then((signature) => {
            $scope.signature = signature;
            $patch();
            SignatureViewer.setSignature(signature, $scope);
            SubmissionMethod.setParams($scope);
          });
          return;
        } else {
          SignatureService.generateHMAC(
            {
              reviewerEmail,
              reviewerType,
              productId,
              timestamp,
            },
            $scope.secretKey,
          ).then((signature) => {
            $scope.signature = signature;
            $patch();
            SignatureViewer.setSignature(signature, $scope);
            SubmissionMethod.setParams($scope);
          });
        }
      };
    },
  );

  app.component<SignatureViewer>(
    "SignatureViewer",
    (
      $scope: SignatureViewerScope,
      $patch: PatchAPI,
      $block: BlockAPI,
      ToastNotification: ToastNotification,
    ) => {
      $scope.signature = "";
      $scope.copyMessage = () => {
        $block("PlainConcatenatedString", (block) => {
          console.log("Accessing PlainConcatenatedString block:", block);
          if (null === block) return;
          if (!(block.$element instanceof HTMLElement)) return;
          navigator.clipboard.writeText(block.$element.innerText);
          ToastNotification.showToast("Message copied to clipboard!");
        });
      };
      $scope.copySignature = () => {
        $block("SignatureText", (block) => {
          console.log("Accessing SignatureText block:", block);
          if (null === block) return;
          if (!(block.$element instanceof HTMLElement)) return;
          navigator.clipboard.writeText(block.$element.innerText);
          ToastNotification.showToast("Signature copied to clipboard!");
        });
      };
      return {
        setSignature: async (
          signature: string,
          params: TrustedVendorsParams,
        ) => {
          $scope.signature = signature;
          $scope.appKey = params.appKey;
          $scope.secretKey = params.secretKey;
          $scope.reviewerEmail = params.reviewerEmail;
          $scope.productId = params.productId;
          $scope.reviewerType = params.reviewerType;
          $scope.digestAlgorithm = params.digestAlgorithm;
          $scope.timestamp = params.timestamp;
          await $patch();
        },
      };
    },
  );

  app.component<SubmissionMethod>(
    "SubmissionMethod",
    (
      $scope: SubmissionMethodScope,
      $patch: PatchAPI,
      $block: BlockAPI,
      $app: AppAPI,
      ToastNotification: ToastNotification,
    ) => {
      $scope.method = "landing_page"; // default value for submission method
      $scope.signature = "";
      $scope.appKey = "";
      $scope.secretKey = "";
      $scope.reviewerEmail = "";
      $scope.productId = "";
      $scope.reviewerType = "verified_buyer";
      $scope.digestAlgorithm = "HMAC";
      $scope.timestamp = Date.now();
      $scope.handleSelectMethod = (method: SubmissionMethodType) => {
        console.log("Selected submission method:", method);
        $scope.method = method;
        $patch();
      };
      $scope.getButtonStyle = (
        method: "landing_page" | "reviews_widget" | "api_endpoint",
      ) => {
        return $scope.method === method
          ? "bg-blue-700 text-white px-4 py-2 rounded-lg"
          : "bg-blue-500 text-white px-4 py-2 rounded-lg";
      };
      function copyAndToast(p: { textToCopy: string; successMessage: string }) {
        navigator.clipboard.writeText(p.textToCopy).then(
          () => {
            ToastNotification.showToast(p.successMessage);
          },
          (err) => {
            console.error("Failed to copy text:", err);
          },
        );
      }
      $scope.copyLandingPageUrl = () => {
        $block("LandingPageUrlText", (block) => {
          if (null === block) return;
          if (!(block.$element instanceof HTMLElement)) return;
          const landingPageUrl = block.$element.innerText;
          copyAndToast({
            textToCopy: landingPageUrl,
            successMessage: "Landing page URL copied to clipboard.",
          });
        });
      };

      $scope.copyDOMElementText = () => {
        $block("HTMLDOMElementText", (block) => {
          if (null === block) return;
          const text = block.$element.getHTML();
          // Convert HTML entities to their corresponding characters
          const textarea = document.createElement("textarea");
          textarea.innerHTML = text;
          const decodedText = textarea.value;
          copyAndToast({
            textToCopy: decodedText,
            successMessage: "HTML copied to clipboard.",
          });
        });
      };

      $scope.copyCurlCommandText = () => {
        $block("CurlCommandText", (block) => {
          if (null === block) return;
          const curlCommandText = block.$element.getHTML();
          copyAndToast({
            textToCopy: curlCommandText,
            successMessage: "cURL command copied to clipboard.",
          });
        });
      };
      return {
        setParams: async (params: TrustedVendorsParams) => {
          $scope.appKey = params.appKey;
          $scope.secretKey = params.secretKey;
          $scope.reviewerEmail = params.reviewerEmail;
          $scope.productId = params.productId;
          $scope.reviewerType = params.reviewerType;
          $scope.digestAlgorithm = params.digestAlgorithm;
          $scope.timestamp = params.timestamp;
          $scope.signature = params.signature;
          await $patch();
        },
      };
    },
  );

  app.component<ToastNotification>("ToastNotification", ($block: BlockAPI) => {
    return {
      showToast: (message: string) => {
        $block("ToastNotificationContainer", (block) => {
          if (null === block) return;
          const messageElement = block.$element.querySelector(
            "[data-toast-message] ",
          );
          if (messageElement) {
            messageElement.textContent = message;
            block.$element.classList.remove("translate-y-12", "opacity-0");
            block.$element.classList.add("translate-y-0", "opacity-100");
            setTimeout(() => {
              block.$element.classList.remove("translate-y-0", "opacity-100");
              block.$element.classList.add("translate-y-12", "opacity-0");
            }, 2400);
          }
        });
      },
    };
  });
})();
