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
      $app.ready(() => {
        const isDarkMode = localStorage.getItem("isDarkMode") === "true";
        $scope.isDarkMode = isDarkMode;
        document.body.classList.toggle("dark-mode", isDarkMode);
        /**
         * @TODO Investigate the issue wherein the toggling the dark mode affects
         * the rendering of the SubmissionMethod component without any errors.
         * For now, we will keep the patch local to the DarkModeToggler block only.
         */
        $patch("DarkModeToggler");
      });
      $scope.toggleDarkMode = () => {
        const isDarkMode = !(localStorage.getItem("isDarkMode") === "true");
        localStorage.setItem("isDarkMode", isDarkMode.toString());
        // Update the UI to reflect the dark mode change
        $scope.isDarkMode = isDarkMode;
        document.body.classList.toggle("dark-mode", isDarkMode);
        /**
         * @TODO Investigate the issue wherein the toggling the dark mode affects
         * the rendering of the SubmissionMethod component without any errors.
         * For now, we will keep the patch local to the DarkModeToggler block only.
         */
        $patch("DarkModeToggler");
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

  app.component(
    "SignatureViewer",
    ($scope: SignatureViewerScope, $patch: PatchAPI) => {
      $scope.signature = "";
      $scope.copyMessage = () => {
        const secretKeySection =
          $scope.digestAlgorithm === "SHA256" ? $scope.secretKey : "";
        const message =
          $scope.reviewerType === "verified_buyer"
            ? `${$scope.reviewerEmail}${$scope.reviewerType}${$scope.productId}${$scope.timestamp}${secretKeySection}`
            : `${$scope.reviewerEmail}${$scope.reviewerType}${$scope.timestamp}${secretKeySection}`;
        navigator.clipboard.writeText(message);
      };
      return {
        setSignature: (signature: string, params: TrustedVendorsParams) => {
          $scope.signature = signature;
          $scope.appKey = params.appKey;
          $scope.secretKey = params.secretKey;
          $scope.reviewerEmail = params.reviewerEmail;
          $scope.productId = params.productId;
          $scope.reviewerType = params.reviewerType;
          $scope.digestAlgorithm = params.digestAlgorithm;
          $scope.timestamp = params.timestamp;
          $patch();
        },
      };
    },
  );

  app.component<SubmissionMethod>(
    "SubmissionMethod",
    ($scope: SubmissionMethodScope, $patch: PatchAPI, $app: AppAPI) => {
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
      return {
        setParams: (params: TrustedVendorsParams) => {
          $scope.appKey = params.appKey;
          $scope.secretKey = params.secretKey;
          $scope.reviewerEmail = params.reviewerEmail;
          $scope.productId = params.productId;
          $scope.reviewerType = params.reviewerType;
          $scope.digestAlgorithm = params.digestAlgorithm;
          $scope.timestamp = params.timestamp;
          $scope.signature = params.signature;
          $patch();
        },
      };
    },
  );
})();
