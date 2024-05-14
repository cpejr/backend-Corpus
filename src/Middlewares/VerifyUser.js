function verifyUser(req, res, next){
    const id = req?.params?.id || req?.body?.id_user || req?.body?._id;

    if(req?.userId !== id){
        return res.status(401).json({ message: "Operação não autorizada. "});
    }

    next();
}

export default verifyUser;