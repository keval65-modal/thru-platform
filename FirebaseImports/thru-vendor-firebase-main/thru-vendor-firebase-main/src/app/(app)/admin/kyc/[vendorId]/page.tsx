
'use client';

import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { getVendorKyc, updateKycStatus, getVendorOrders } from '../../actions';
import { KycState, KycDocument, KycStatus } from '@/types/kyc';
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, ExternalLink, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

// Helper to render a document
const DocumentRow = ({ title, doc }: { title: string, doc?: KycDocument }) => {
    if (!doc) return null;
    return (
        <div className="flex items-center justify-between py-3 border-b last:border-0">
            <div>
                <p className="font-medium text-sm">{title}</p>
                <p className="text-xs text-muted-foreground">{doc.filename} • {new Date(doc.uploadedAt).toLocaleDateString()}</p>
            </div>
            <div className="flex items-center gap-2">
                 <Badge variant={
                    doc.status === KycStatus.APPROVED ? "default" : 
                    doc.status === KycStatus.REJECTED ? "destructive" : "secondary"
                }>
                    {doc.status}
                </Badge>
                <Button size="sm" variant="outline" asChild>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4" />
                    </a>
                </Button>
            </div>
        </div>
    );
};

export default function KycReviewPage({ params }: { params: { vendorId: string } }) {
    const { vendorId } = params;
    const { toast } = useToast();
    const [kycData, setKycData] = useState<KycState | null>(null);
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const kyc = await getVendorKyc(vendorId);
            if (kyc.data) setKycData(kyc.data);
            
            const vendorOrders = await getVendorOrders(vendorId);
            setOrders(vendorOrders);
            
            setLoading(false);
        };
        load();
    }, [vendorId]);

    const handleKycAction = async (status: 'APPROVED' | 'REJECTED') => {
        if (!confirm(`Are you sure you want to mark this KYC as ${status}?`)) return;
        setUpdating(true);
        const res = await updateKycStatus(vendorId, status);
        if (res.success) {
            toast({ title: "Updated", description: `KYC status updated to ${status}` });
            // Reload
            const kyc = await getVendorKyc(vendorId);
            if (kyc.data) setKycData(kyc.data);
        } else {
            toast({ variant: "destructive", title: "Error", description: res.error });
        }
        setUpdating(false);
    };

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

    if (!kycData) return (
        <div className="p-8">
            <Card>
                <CardHeader><CardTitle>No KYC Data Found</CardTitle></CardHeader>
                <CardContent>The vendor has not submitted KYC details yet.</CardContent>
            </Card>
        </div>
    );

    return (
        <div className="container mx-auto py-8 space-y-8">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/admin"><ArrowLeft className="w-4 h-4" /></Link>
                </Button>
                <div>
                   <h1 className="text-2xl font-bold">Vendor Review</h1>
                   <p className="text-muted-foreground">KYC Verification & Orders</p>
                </div>
                <div className="ml-auto flex gap-2">
                     <Button 
                        disabled={updating || kycData.businessKycStatus === KycStatus.REJECTED}
                        variant="destructive" 
                        onClick={() => handleKycAction('REJECTED')}
                     >
                         <XCircle className="w-4 h-4 mr-2" /> Reject KYC
                     </Button>
                     <Button 
                         disabled={updating || kycData.businessKycStatus === KycStatus.APPROVED}
                         variant="default"
                         className="bg-green-600 hover:bg-green-700"
                         onClick={() => handleKycAction('APPROVED')}
                     >
                         <CheckCircle className="w-4 h-4 mr-2" /> Approve KYC
                     </Button>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                 {/* Identity Proofs */}
                 <Card>
                     <CardHeader>
                         <CardTitle>Identity Proofs (Basic)</CardTitle>
                     </CardHeader>
                     <CardContent className="space-y-1">
                         <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-muted rounded">
                             <div>
                                 <span className="text-xs font-semibold uppercase text-muted-foreground">PAN Number</span>
                                 <p className="font-mono">{kycData.panNumber || 'N/A'}</p>
                             </div>
                             <div>
                                 <span className="text-xs font-semibold uppercase text-muted-foreground">Aadhaar Number</span>
                                 <p className="font-mono">{kycData.aadhaarNumber || 'N/A'}</p>
                             </div>
                         </div>
                         <DocumentRow title="PAN Card" doc={kycData.panImage} />
                         <DocumentRow title="Aadhaar Card" doc={kycData.aadhaarImage} />
                         <DocumentRow title="Bank Proof" doc={kycData.bankProof} />
                     </CardContent>
                 </Card>

                 {/* Business Proofs */}
                 <Card>
                     <CardHeader>
                         <CardTitle>Business Proofs ({kycData.vendorType})</CardTitle>
                     </CardHeader>
                     <CardContent className="space-y-1">
                         {/* Sole Proprietor */}
                         <DocumentRow title="Shop Act" doc={kycData.shopAct} />
                         <DocumentRow title="Udyam Registration" doc={kycData.udyam} />
                         <DocumentRow title="Trade License" doc={kycData.tradeLicense} />
                         <DocumentRow title="GST Certificate" doc={kycData.gst} />
                         
                         {/* Other Types */}
                         <DocumentRow title="Incorporation Cert" doc={kycData.incorporationCert} />
                         <DocumentRow title="Partnership Deed" doc={kycData.partnershipDeed} />
                         <DocumentRow title="MOA / AOA" doc={kycData.moaAoa} />
                         <DocumentRow title="Board Resolution" doc={kycData.boardResolution} />
                     </CardContent>
                 </Card>
            </div>
            
            {/* Orders Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Customer Orders</CardTitle>
                    <CardDescription>Recent orders received by this vendor</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Order ID</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Items</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orders.length > 0 ? (
                                orders.map(order => (
                                    <TableRow key={order.id}>
                                        <TableCell className="font-mono text-xs">{order.id.slice(0,8)}...</TableCell>
                                        <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                                        <TableCell>{order.customer_name || 'N/A'}</TableCell>
                                        <TableCell>{(order.items || []).length} items</TableCell>
                                        <TableCell>₹{order.total_amount}</TableCell>
                                        <TableCell><Badge variant="outline">{order.status}</Badge></TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground">No orders found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
