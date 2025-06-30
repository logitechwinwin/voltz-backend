import { BadRequestException, Injectable } from "@nestjs/common";
import axios from "axios";
import { create } from "xmlbuilder2";
import { getClientIp } from "request-ip";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class PaymentService {
  private cxPayApiKey: string;
  private cxPayGatewayURL: string;

  constructor(private readonly configService: ConfigService) {
    this.cxPayApiKey = this.configService.get("cxPay.apiKey");
    this.cxPayGatewayURL = "https://cxpay.transactiongateway.com/api/v2/three-step";
  }

  async createPayment({
    billingInfo,
    productInfo,
    redirectUrl,
    userId,
    req,
  }: {
    productInfo: {
      unitCost: number;
      quantity?: number;
      totalAmount?: number;
      productCode?: string;
      description?: string;
      commodityCode?: string;
      unitOfMeasure?: string;
      taxAmount?: string;
      taxRate?: string;
      discountAmount?: string;
      discountRate?: string;
      taxType?: string;
      alternateTaxId?: string;
    };
    billingInfo: {
      firstName: string;
      lastName: string;
      email: string;
      phoneNumber: string;
      address1?: string;
      address2?: string;
      city?: string;
      state?: string;
      postal?: string;
      country?: string;
      company?: string;
      fax?: string;
    };
    redirectUrl: string;
    userId: number;
    req: any;
  }): Promise<string> {
    const {
      firstName,
      lastName,
      email,
      phoneNumber: phone,
      address1 = "New York", // default value
      address2 = "Boston",
      city = "New York",
      state = "NY",
      postal = "8019231",
      country = "USA",
      company = "test company",
      fax = "+297589583595",
    } = billingInfo;

    const {
      unitCost,
      quantity = 1,
      totalAmount = quantity * unitCost,
      productCode = "SKU-123456",
      description = "test product description",
      commodityCode = "abc",
      unitOfMeasure = "lbs",
      taxAmount = "0.00",
      taxRate = "0.00",
      discountAmount = "0.00",
      discountRate = "0.00",
      taxType = "sales",
      alternateTaxId = "12345",
    } = productInfo;

    const xmlRequest = create({ version: "1.0", encoding: "UTF-8" })
      .ele("sale")
      .ele("api-key")
      .txt(this.cxPayApiKey)
      .up()
      .ele("redirect-url")
      .txt(`${redirectUrl}/${userId}`)
      .up()
      .ele("amount")
      .txt(`${unitCost}`)
      .up()
      .ele("ip-address")
      .txt(getClientIp(req))
      .up()
      .ele("currency")
      .txt("USD")
      .up()
      .ele("billing")
      .ele("first-name")
      .txt(firstName)
      .up()
      .ele("last-name")
      .txt(lastName)
      .up()
      .ele("address1")
      .txt(address1)
      .up()
      .ele("city")
      .txt(city)
      .up()
      .ele("state")
      .txt(state)
      .up()
      .ele("postal")
      .txt(postal)
      .up()
      .ele("country")
      .txt(country)
      .up()
      .ele("email")
      .txt(email)
      .up()
      .ele("phone")
      .txt(phone)
      .up()
      .ele("company")
      .txt(company)
      .up()
      .ele("address2")
      .txt(address2)
      .up()
      .ele("fax")
      .txt(fax)
      .up()
      .up()
      .ele("product")
      .ele("product-code")
      .txt(productCode)
      .up()
      .ele("description")
      .txt(description)
      .up()
      .ele("commodity-code")
      .txt(commodityCode)
      .up()
      .ele("unit-of-measure")
      .txt(unitOfMeasure)
      .up()
      .ele("unit-cost")
      .txt(`${unitCost}`)
      .up()
      .ele("quantity")
      .txt(`${quantity}`)
      .up()
      .ele("total-amount")
      .txt(`${totalAmount}`)
      .up()
      .ele("tax-amount")
      .txt(taxAmount)
      .up()
      .ele("tax-rate")
      .txt(taxRate)
      .up()
      .ele("discount-amount")
      .txt(discountAmount)
      .up()
      .ele("discount-rate")
      .txt(discountRate)
      .up()
      .ele("tax-type")
      .txt(taxType)
      .up()
      .ele("alternate-tax-id")
      .txt(alternateTaxId)
      .up()
      .up()
      .end({ prettyPrint: true });

    const response = await axios.post(this.cxPayGatewayURL, xmlRequest, {
      headers: { "Content-Type": "text/xml" },
    });

    const gwResponse = (
      await new (require("xml2js").Parser({ explicitArray: false }).parseStringPromise)(response.data)
    ).response;

    console.log("gwResponse", gwResponse);

    if (gwResponse && gwResponse.result === "1") {
      return gwResponse["form-url"];
    }

    throw new BadRequestException("Something went wrong please try again");
  }

  async verifyPayment(tokenId: string): Promise<boolean> {
    const xmlRequest = create({ version: "1.0", encoding: "UTF-8" })
      .ele("complete-action")
      .ele("api-key")
      .txt(this.cxPayApiKey)
      .up()
      .ele("token-id")
      .txt(tokenId)
      .up()
      .end({ prettyPrint: true });

    const response = await axios.post(this.cxPayGatewayURL, xmlRequest.toString(), {
      headers: { "Content-Type": "text/xml" },
    });

    const gwResponse = (
      await new (require("xml2js").Parser({ explicitArray: false }).parseStringPromise)(response.data)
    ).response;
    console.log("🚀 ~ PaymentService ~ verifyPayment ~ gwResponse:", gwResponse);

    if (gwResponse.result !== "1") {
      throw new BadRequestException("Something went wrong, please try again");
    }

    return gwResponse;
  }
}
